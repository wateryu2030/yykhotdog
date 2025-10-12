#!/usr/bin/env python3
"""
创建示例数据用于测试
"""

import pyodbc
from datetime import datetime, timedelta
import random

# 本地SQL Server连接配置
SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    """获取数据库连接"""
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return None

def create_sample_tables_and_data(conn, database_name):
    """创建示例表和数据"""
    try:
        cursor = conn.cursor()
        cursor.execute(f"USE [{database_name}]")
        
        print(f"🔄 在 {database_name} 中创建示例数据...")
        
        # 1. 创建Shop表
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Shop]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[Shop] (
                [Id] INT PRIMARY KEY,
                [ShopName] NVARCHAR(100),
                [ShopAddress] NVARCHAR(200),
                [Director] NVARCHAR(50),
                [DirectorPhone] NVARCHAR(20),
                [province] NVARCHAR(50),
                [city] NVARCHAR(50),
                [district] NVARCHAR(50),
                [location] NVARCHAR(100),
                [isUse] INT DEFAULT 1,
                [isClose] INT DEFAULT 0,
                [delflag] INT DEFAULT 0,
                [RecordTime] DATETIME2 DEFAULT GETDATE()
            );
        END
        """)
        
        # 2. 创建Category表
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Category]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[Category] (
                [id] INT PRIMARY KEY,
                [catName] NVARCHAR(100),
                [delflag] INT DEFAULT 0
            );
        END
        """)
        
        # 3. 创建Goods表
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Goods]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[Goods] (
                [id] INT PRIMARY KEY,
                [goodsName] NVARCHAR(200),
                [categoryId] INT,
                [goodsPrice] DECIMAL(10,2),
                [goodsDesc] NVARCHAR(500),
                [delflag] INT DEFAULT 0
            );
        END
        """)
        
        # 4. 创建Orders表
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[Orders] (
                [id] BIGINT PRIMARY KEY,
                [openId] NVARCHAR(100),
                [shopId] INT,
                [total] DECIMAL(10,2),
                [payState] INT DEFAULT 0,
                [state] INT DEFAULT 0,
                [remark] NVARCHAR(500),
                [delflag] INT DEFAULT 0,
                [recordTime] DATETIME2 DEFAULT GETDATE()
            );
        END
        """)
        
        # 5. 创建OrderGoods表
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OrderGoods]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[OrderGoods] (
                [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
                [orderId] BIGINT,
                [goodsId] INT,
                [goodsNumber] INT,
                [goodsPrice] DECIMAL(10,2),
                [delflag] INT DEFAULT 0
            );
        END
        """)
        
        print(f"   ✅ 表结构创建完成")
        
        # 6. 插入示例数据
        print(f"   🔄 插入示例数据...")
        
        # 插入门店数据
        shops = [
            (1, "热狗王总店", "北京市朝阳区三里屯", "张三", "13800138001", "北京", "朝阳区", "三里屯", "116.4074,39.9042", 1, 0, 0),
            (2, "热狗王分店", "上海市浦东新区陆家嘴", "李四", "13800138002", "上海", "浦东新区", "陆家嘴", "121.4737,31.2304", 1, 0, 0),
            (3, "热狗王旗舰店", "广州市天河区珠江新城", "王五", "13800138003", "广东", "广州市", "天河区", "113.2644,23.1291", 1, 0, 0)
        ]
        
        for shop in shops:
            cursor.execute("""
                INSERT INTO Shop (Id, ShopName, ShopAddress, Director, DirectorPhone, province, city, district, location, isUse, isClose, delflag)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, shop)
        
        # 插入分类数据
        categories = [
            (1, "经典热狗", 0),
            (2, "特色热狗", 0),
            (3, "饮品", 0),
            (4, "小食", 0)
        ]
        
        for category in categories:
            cursor.execute("""
                INSERT INTO Category (id, catName, delflag)
                VALUES (?, ?, ?)
            """, category)
        
        # 插入商品数据
        goods = [
            (1, "经典热狗", 1, 15.00, "经典口味热狗", 0),
            (2, "芝士热狗", 2, 18.00, "芝士口味热狗", 0),
            (3, "辣味热狗", 2, 16.00, "辣味热狗", 0),
            (4, "可乐", 3, 5.00, "可口可乐", 0),
            (5, "薯条", 4, 8.00, "香脆薯条", 0)
        ]
        
        for good in goods:
            cursor.execute("""
                INSERT INTO Goods (id, goodsName, categoryId, goodsPrice, goodsDesc, delflag)
                VALUES (?, ?, ?, ?, ?, ?)
            """, good)
        
        # 插入订单数据
        orders = []
        order_id = 1
        for i in range(50):  # 创建50个订单
            open_id = f"openid_{i+1:03d}"
            shop_id = random.choice([1, 2, 3])
            total = round(random.uniform(20, 100), 2)
            pay_state = random.choice([1, 2])  # 1-已支付, 2-已支付
            state = random.choice([1, 2])  # 1-已完成, 2-已完成
            record_time = datetime.now() - timedelta(days=random.randint(1, 30))
            
            orders.append((order_id, open_id, shop_id, total, pay_state, state, f"订单{order_id}", 0, record_time))
            order_id += 1
        
        for order in orders:
            cursor.execute("""
                INSERT INTO Orders (id, openId, shopId, total, payState, state, remark, delflag, recordTime)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, order)
        
        # 插入订单商品数据
        order_items = []
        for order_id in range(1, 51):
            # 每个订单1-3个商品
            item_count = random.randint(1, 3)
            for j in range(item_count):
                goods_id = random.choice([1, 2, 3, 4, 5])
                quantity = random.randint(1, 3)
                # 获取商品价格
                cursor.execute("SELECT goodsPrice FROM Goods WHERE id = ?", (goods_id,))
                price = cursor.fetchone()[0]
                total_price = price * quantity
                
                order_items.append((order_id, goods_id, quantity, price, total_price, 0))
        
        for item in order_items:
            cursor.execute("""
                INSERT INTO OrderGoods (orderId, goodsId, goodsNumber, goodsPrice, delflag)
                VALUES (?, ?, ?, ?, ?)
            """, item)
        
        print(f"   ✅ 示例数据插入完成")
        
        # 7. 验证数据
        cursor.execute("SELECT COUNT(*) FROM Shop")
        shop_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Category")
        category_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Goods")
        goods_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Orders")
        order_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM OrderGoods")
        order_item_count = cursor.fetchone()[0]
        
        print(f"   📊 数据统计:")
        print(f"     门店: {shop_count} 个")
        print(f"     分类: {category_count} 个")
        print(f"     商品: {goods_count} 个")
        print(f"     订单: {order_count} 个")
        print(f"     订单商品: {order_item_count} 个")
        
        return True
        
    except Exception as e:
        print(f"❌ 创建示例数据失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 创建示例数据")
    print("=" * 60)
    
    # 连接数据库
    print("\n1️⃣ 连接本地SQL Server...")
    conn = get_connection()
    if not conn:
        return False
    print("✅ 数据库连接成功")
    
    # 为cyrg2025创建示例数据
    print("\n2️⃣ 为cyrg2025创建示例数据...")
    success1 = create_sample_tables_and_data(conn, "cyrg2025")
    
    # 为cyrgweixin创建示例数据
    print("\n3️⃣ 为cyrgweixin创建示例数据...")
    success2 = create_sample_tables_and_data(conn, "cyrgweixin")
    
    # 验证所有数据库
    print("\n4️⃣ 验证所有数据库...")
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                name as '数据库名称',
                state_desc as '状态'
            FROM sys.databases 
            WHERE name IN ('cyrg2025', 'cyrgweixin', 'hotdog2030')
            ORDER BY name
        """)
        
        databases = cursor.fetchall()
        print("\n📋 数据库列表:")
        print("-" * 40)
        for db in databases:
            print(f"✅ {db[0]} - {db[1]}")
        
        # 检查每个数据库的表数量
        print(f"\n📊 数据库表统计:")
        print("-" * 30)
        for db_name in ['cyrg2025', 'cyrgweixin', 'hotdog2030']:
            try:
                cursor.execute(f"USE [{db_name}]")
                cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
                table_count = cursor.fetchone()[0]
                print(f"  {db_name}: {table_count} 个表")
            except Exception as e:
                print(f"  {db_name}: 无法访问 - {e}")
        
    except Exception as e:
        print(f"❌ 验证数据库时发生错误: {e}")
    
    # 关闭连接
    conn.close()
    
    # 输出结果
    print("\n" + "=" * 60)
    print("📊 创建结果:")
    print(f"cyrg2025: {'✅ 成功' if success1 else '❌ 失败'}")
    print(f"cyrgweixin: {'✅ 成功' if success2 else '❌ 失败'}")
    print("=" * 60)
    
    if success1 and success2:
        print("🎉 示例数据创建完成！")
        print("\n下一步:")
        print("1. 运行 'python3 migrate-data-to-hotdog2030.py' 开始数据迁移")
        print("2. 运行 'node test-local-db.js' 测试连接")
    else:
        print("⚠️  部分示例数据创建失败，请检查错误信息")
    
    return success1 and success2

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
