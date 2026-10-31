import json
import mysql.connector
import os

# DB 연결
conn = mysql.connector.connect(
    host=os.environ.get('DATABASE_HOST', 'localhost'),
    user=os.environ.get('DATABASE_USER', 'root'),
    password=os.environ.get('DATABASE_PASSWORD', ''),
    database=os.environ.get('DATABASE_NAME', 'japanese_drugstore_mall')
)
cursor = conn.cursor()

# JSON 파일 로드
with open('/home/ubuntu/processed_products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# 상품 삽입
inserted = 0
for product in products:
    try:
        sql = """INSERT INTO products (name, description, price, image_url, stock, is_featured, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())"""
        
        values = (
            product['name'][:200],  # 최대 200자
            product['description'][:500],  # 최대 500자
            product['price'],
            product['image_url'],
            product['stock'],
            1 if product['is_featured'] else 0
        )
        
        cursor.execute(sql, values)
        inserted += 1
        print(f"✓ 삽입 완료: {product['name'][:50]}...")
    except Exception as e:
        print(f"✗ 삽입 실패: {product['name'][:50]}... - {e}")

conn.commit()
cursor.close()
conn.close()

print(f"\n총 {inserted}개 상품 DB 삽입 완료!")
