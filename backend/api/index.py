import json
import os
import hashlib
import random
import string
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode('utf-8')).hexdigest()


def _resp(status: int, body: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body, ensure_ascii=False)}


def _conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _order_number() -> str:
    return ''.join(random.choices(string.digits, k=6))


def handler(event: dict, context) -> dict:
    '''Платформа кафе: регистрация, вход, оформление заказов, баллы лояльности и админ-панель'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    conn = _conn()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        if method == 'POST' and action == 'register':
            name = (body.get('name') or '').strip()
            phone = (body.get('phone') or '').strip()
            password = body.get('password') or ''
            if not name or not phone or not password:
                return _resp(400, {'error': 'Заполните все поля'})
            cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
            if cur.fetchone():
                return _resp(409, {'error': 'Пользователь с таким телефоном уже есть'})
            cur.execute(
                "INSERT INTO users (name, phone, password_hash) VALUES (%s, %s, %s) RETURNING id, name, phone, role, points",
                (name, phone, _hash(password)),
            )
            u = cur.fetchone()
            return _resp(200, {'user': u})

        if method == 'POST' and action == 'login':
            phone = (body.get('phone') or '').strip()
            password = body.get('password') or ''
            # спец-вход админа НИКИТОВСКИЙ / НИКИТОВСКИЙ
            cur.execute("SELECT id, name, phone, role, points, password_hash FROM users WHERE phone = %s", (phone,))
            u = cur.fetchone()
            if not u:
                return _resp(404, {'error': 'Пользователь не найден'})
            ok = u['password_hash'] == _hash(password) or (u['role'] == 'admin' and phone == 'НИКИТОВСКИЙ' and password == 'НИКИТОВСКИЙ')
            if not ok:
                return _resp(401, {'error': 'Неверный пароль'})
            u.pop('password_hash', None)
            return _resp(200, {'user': u})

        if method == 'POST' and action == 'order':
            user_id = body.get('user_id')
            if not user_id:
                return _resp(401, {'error': 'Требуется вход в аккаунт'})
            items = body.get('items') or []
            total = int(body.get('total') or 0)
            place_id = body.get('place_id') or ''
            place_name = body.get('place_name') or ''
            if not items or total <= 0:
                return _resp(400, {'error': 'Корзина пуста'})
            points = total // 20
            number = _order_number()
            cur.execute(
                "INSERT INTO orders (order_number, user_id, place_id, place_name, items, total, points_earned) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING order_number, total, points_earned, status, created_at",
                (number, user_id, place_id, place_name, json.dumps(items, ensure_ascii=False), total, points),
            )
            order = cur.fetchone()
            cur.execute("UPDATE users SET points = points + %s WHERE id = %s RETURNING points", (points, user_id))
            new_points = cur.fetchone()['points']
            order['created_at'] = str(order['created_at'])
            return _resp(200, {'order': order, 'points': new_points})

        if method == 'GET' and action == 'my_orders':
            user_id = params.get('user_id')
            if not user_id:
                return _resp(401, {'error': 'Требуется вход'})
            cur.execute(
                "SELECT order_number, place_name, total, points_earned, status, created_at FROM orders WHERE user_id = %s ORDER BY id DESC",
                (int(user_id),),
            )
            rows = cur.fetchall()
            for r in rows:
                r['created_at'] = str(r['created_at'])
            return _resp(200, {'orders': rows})

        if method == 'GET' and action == 'admin_orders':
            cur.execute(
                "SELECT o.order_number, o.place_name, o.total, o.status, o.created_at, u.name AS client_name, u.phone "
                "FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 100"
            )
            rows = cur.fetchall()
            for r in rows:
                r['created_at'] = str(r['created_at'])
            return _resp(200, {'orders': rows})

        if method == 'GET' and action == 'check_order':
            number = params.get('number', '')
            cur.execute(
                "SELECT o.order_number, o.place_name, o.total, o.status, o.items, u.name AS client_name, u.phone "
                "FROM orders o JOIN users u ON u.id = o.user_id WHERE o.order_number = %s",
                (number,),
            )
            row = cur.fetchone()
            if not row:
                return _resp(404, {'error': 'Заказ не найден'})
            return _resp(200, {'order': row})

        return _resp(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()
