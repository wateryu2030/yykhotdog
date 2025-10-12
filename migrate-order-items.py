#!/usr/bin/env python3
"""
迁移订单商品明细数据
从cyrg2025.OrderGoods到hotdog2030.order_items
"""

import pyodbc
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SERVER = "localhost,1433"
USERNAME = "sa"
PASSWORD = "YourStrong@Passw0rd"
DRIVER = "ODBC Driver 18 for SQL Server"

def get_connection():
    try:
        connection_string = f"DRIVER={{{DRIVER}}};SERVER={SERVER};UID={USERNAME};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;"
        conn = pyodbc.connect(connection_string, autocommit=True)
        return conn
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        return None

def migrate_order_items(conn):
    logger.info("🚀 开始迁移订单商品明细数据")
    
    cursor = conn.cursor()
    
    try:
        # 清空现有数据
        logger.info("🗑️  清空现有order_items数据...")
        cursor.execute("DELETE FROM hotdog2030.dbo.order_items")
        logger.info("✅ 现有数据已清空")
        
        # 切换到cyrg2025数据库
        cursor.execute("USE cyrg2025")
        
        # 查询订单商品数据（只包含有效订单的商品）
        logger.info("📊 查询源数据...")
        cursor.execute("""
        SELECT 
            og.id,
            og.orderId,
            og.goodsId,
            og.goodsName,
            og.goodsNumber,
            og.goodsPrice,
            og.goodsTotal,
            og.categoryName,
            og.goodsText,
            og.recordTime,
            og.shopId,
            og.shopName
        FROM OrderGoods og
        INNER JOIN Orders o ON og.orderId = o.id
        WHERE (og.delflag = 0 OR og.delflag IS NULL)
          AND (o.delflag = 0 OR o.delflag IS NULL)
          AND og.goodsName IS NOT NULL
          AND og.goodsName != ''
        ORDER BY og.orderId, og.id
        """)
        
        order_goods = cursor.fetchall()
        logger.info(f"📋 查询到 {len(order_goods)} 条订单商品记录")
        
        # 切换到hotdog2030数据库
        cursor.execute("USE hotdog2030")
        
        # 创建订单ID映射（直接使用相同的ID）
        logger.info("🔗 创建订单ID映射...")
        cursor.execute("""
        SELECT id
        FROM orders 
        WHERE delflag = 0
        """)
        order_map = set()
        for (order_id,) in cursor.fetchall():
            order_map.add(order_id)
        
        logger.info(f"✅ 创建了 {len(order_map)} 个有效订单ID集合")
        
        # 插入数据
        logger.info("💾 开始插入数据...")
        insert_sql = """
        INSERT INTO order_items 
        (order_id, product_id, product_name, quantity, price, total_price, created_at, updated_at, delflag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        success_count = 0
        skipped_count = 0
        
        for item in order_goods:
            try:
                item_id, order_id, goods_id, goods_name, goods_number, goods_price, goods_total, \
                category_name, goods_text, record_time, shop_id, shop_name = item
                
                # 检查订单ID是否存在
                if order_id not in order_map:
                    skipped_count += 1
                    continue
                
                # 解析记录时间
                created_at = None
                if record_time:
                    try:
                        created_at = datetime.strptime(record_time, '%Y-%m-%d %H:%M:%S')
                    except:
                        created_at = datetime.now()
                else:
                    created_at = datetime.now()
                
                # 确保价格字段不为NULL
                safe_goods_price = goods_price if goods_price is not None else 0.0
                safe_goods_total = goods_total if goods_total is not None else 0.0
                safe_goods_name = goods_name if goods_name is not None else '未知商品'
                
                cursor.execute(insert_sql, (
                    order_id,          # order_id (直接使用相同的ID)
                    goods_id,          # product_id
                    safe_goods_name,   # product_name
                    goods_number,      # quantity
                    safe_goods_price,  # unit_price
                    safe_goods_total,  # total_price
                    created_at,        # created_at
                    created_at,        # updated_at
                    0                  # delflag
                ))
                success_count += 1
                
                if success_count % 10000 == 0:
                    logger.info(f"   进度: {success_count}/{len(order_goods)}")
                    
            except Exception as e:
                logger.warning(f"插入失败 (ID:{item_id}): {e}")
                skipped_count += 1
        
        logger.info(f"✅ 成功迁移 {success_count}/{len(order_goods)} 条记录")
        if skipped_count > 0:
            logger.warning(f"⚠️  跳过 {skipped_count} 条记录（订单ID未映射）")
        
        # 验证数据
        cursor.execute("SELECT COUNT(*) FROM order_items WHERE delflag = 0")
        final_count = cursor.fetchone()[0]
        logger.info(f"📊 最终数据量: {final_count} 条")
        
        # 检查特定订单的商品明细
        cursor.execute("""
        SELECT 
            oi.order_id,
            oi.product_name,
            oi.quantity,
            oi.unit_price,
            oi.total_price,
            o.order_no
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.order_no = 'ORD_156040'
        AND oi.delflag = 0
        """)
        specific_order = cursor.fetchall()
        logger.info(f"\n🎯 订单ORD_156040的商品明细:")
        if specific_order:
            total_items = 0
            total_amount = 0
            for order_id, product, qty, price, total, order_no in specific_order:
                logger.info(f"  {product} x{qty} @¥{price} = ¥{total}")
                total_items += qty
                total_amount += float(total)
            logger.info(f"  总计: {total_items}件商品, ¥{total_amount:.2f}")
        else:
            logger.warning("  未找到该订单的商品明细")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 迁移失败: {e}")
        return False

def main():
    logger.info("=" * 80)
    logger.info("📦 订单商品明细数据迁移")
    logger.info("=" * 80)
    
    conn = get_connection()
    if not conn:
        logger.error("❌ 无法连接数据库")
        return
    
    try:
        success = migrate_order_items(conn)
        if success:
            logger.info("\n🎉 订单商品明细迁移完成！")
            logger.info("\n下一步:")
            logger.info("  1. 更新后端API以支持商品明细查询")
            logger.info("  2. 更新前端组件显示商品明细")
        else:
            logger.error("\n❌ 迁移失败")
    except Exception as e:
        logger.error(f"❌ 执行失败: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
