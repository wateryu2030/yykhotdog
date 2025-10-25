#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('../backend/env.example')

def test_maxcompute_connection():
    """测试MaxCompute连接"""
    print("🔍 测试MaxCompute连接...")
    
    # 获取配置
    access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID')
    access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET')
    project = os.getenv('MAXCOMPUTE_PROJECT', 'zhhotdog_project')
    endpoint = os.getenv('MAXCOMPUTE_ENDPOINT', 'https://service.cn.maxcompute.aliyun.com/api')
    
    print(f"📋 MaxCompute配置:")
    print(f"  AccessKey ID: {'***已设置***' if access_key_id else '未设置'}")
    print(f"  AccessKey Secret: {'***已设置***' if access_key_secret else '未设置'}")
    print(f"  Project: {project}")
    print(f"  Endpoint: {endpoint}")
    
    if not access_key_id or not access_key_secret:
        print("❌ MaxCompute配置不完整")
        return False
    
    try:
        # 尝试导入MaxCompute SDK
        try:
            from odps import ODPS
        except ImportError:
            print("⚠️  MaxCompute SDK未安装，请运行:")
            print("   pip install pyodps")
            return False
        
        # 创建连接
        print("\n🔄 尝试连接MaxCompute...")
        odps = ODPS(
            access_key_id,
            access_key_secret,
            project,
            endpoint=endpoint
        )
        
        # 测试连接
        print("✅ MaxCompute连接成功！")
        
        # 获取项目信息
        print(f"\n📊 项目信息:")
        print(f"  项目名称: {odps.project}")
        print(f"  端点: {odps.endpoint}")
        
        # 列出表
        print(f"\n📋 项目中的表:")
        tables = list(odps.list_tables())
        if tables:
            for table in tables[:5]:  # 只显示前5个表
                print(f"  - {table.name}")
            if len(tables) > 5:
                print(f"  ... 还有 {len(tables) - 5} 个表")
        else:
            print("  暂无表")
        
        return True
        
    except Exception as e:
        print(f"❌ MaxCompute连接失败: {str(e)}")
        return False

def test_dataworks_connection():
    """测试DataWorks连接"""
    print("\n🔍 测试DataWorks连接...")
    
    access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID')
    access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET')
    region = os.getenv('ALIYUN_REGION', 'cn-hangzhou')
    
    print(f"📋 DataWorks配置:")
    print(f"  AccessKey ID: {'***已设置***' if access_key_id else '未设置'}")
    print(f"  AccessKey Secret: {'***已设置***' if access_key_secret else '未设置'}")
    print(f"  Region: {region}")
    
    if not access_key_id or not access_key_secret:
        print("❌ DataWorks配置不完整")
        return False
    
    try:
        # 尝试导入阿里云SDK
        try:
            from aliyunsdkcore.client import AcsClient
            from aliyunsdkdataworks_public.request.v20200518 import ListProjectsRequest
        except ImportError:
            print("⚠️  阿里云SDK未安装，请运行:")
            print("   pip install aliyun-python-sdk-core aliyun-python-sdk-dataworks-public")
            return False
        
        # 创建客户端
        print("\n🔄 尝试连接DataWorks...")
        client = AcsClient(access_key_id, access_key_secret, region)
        
        # 测试API调用
        request = ListProjectsRequest()
        request.set_accept_format('json')
        request.set_PageSize(5)
        
        response = client.do_action_with_exception(request)
        print("✅ DataWorks连接成功！")
        
        # 解析响应
        import json
        result = json.loads(response.decode('utf-8'))
        
        print(f"\n📊 DataWorks项目列表:")
        if 'Data' in result and 'Projects' in result['Data']:
            projects = result['Data']['Projects']
            for project in projects[:3]:  # 只显示前3个项目
                print(f"  - {project.get('ProjectName', 'Unknown')}")
            if len(projects) > 3:
                print(f"  ... 还有 {len(projects) - 3} 个项目")
        else:
            print("  暂无项目")
        
        return True
        
    except Exception as e:
        print(f"❌ DataWorks连接失败: {str(e)}")
        return False

def test_rds_connection():
    """测试RDS连接"""
    print("\n🔍 测试RDS连接...")
    
    host = os.getenv('DB_HOST')
    port = os.getenv('DB_PORT', '3306')
    username = os.getenv('DB_USERNAME')
    password = os.getenv('DB_PASSWORD')
    database = os.getenv('DB_NAME')
    
    print(f"📋 RDS配置:")
    print(f"  Host: {host}")
    print(f"  Port: {port}")
    print(f"  Username: {username}")
    print(f"  Database: {database}")
    print(f"  Password: {'***已设置***' if password else '未设置'}")
    
    if not all([host, username, password, database]):
        print("❌ RDS配置不完整")
        return False
    
    try:
        # 尝试导入MySQL连接器
        try:
            import pymysql
        except ImportError:
            print("⚠️  PyMySQL未安装，请运行:")
            print("   pip install pymysql")
            return False
        
        # 创建连接
        print("\n🔄 尝试连接RDS...")
        connection = pymysql.connect(
            host=host,
            port=int(port),
            user=username,
            password=password,
            database=database,
            charset='utf8mb4',
            connect_timeout=10
        )
        
        print("✅ RDS连接成功！")
        
        # 测试查询
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"\n📊 数据库版本: {version[0]}")
            
            # 测试创建表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_connection (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    test_name VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("✅ 测试表创建成功")
            
            # 测试插入数据
            cursor.execute(
                "INSERT INTO test_connection (test_name) VALUES (%s)",
                ('Python连接测试',)
            )
            print("✅ 数据插入成功")
            
            # 测试查询数据
            cursor.execute("SELECT * FROM test_connection ORDER BY id DESC LIMIT 1")
            result = cursor.fetchone()
            print(f"✅ 查询结果: {result}")
            
            # 清理测试数据
            cursor.execute("DELETE FROM test_connection WHERE test_name = %s", ('Python连接测试',))
            cursor.execute("DROP TABLE test_connection")
            print("✅ 测试数据清理完成")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ RDS连接失败: {str(e)}")
        return False

def main():
    """主函数"""
    print("🚀 开始阿里云服务连接测试...\n")
    
    tests = [
        ("RDS数据库", test_rds_connection),
        ("MaxCompute", test_maxcompute_connection),
        ("DataWorks", test_dataworks_connection)
    ]
    
    results = []
    
    for name, test_func in tests:
        print(f"{'='*50}")
        print(f"测试: {name}")
        print(f"{'='*50}")
        
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ 测试异常: {str(e)}")
            results.append((name, False))
    
    # 输出总结
    print(f"\n{'='*50}")
    print("📊 测试总结:")
    print(f"{'='*50}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    
    print(f"\n总计: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有连接测试通过！")
    elif passed > 0:
        print("⚠️  部分连接测试通过，请检查失败的连接")
    else:
        print("❌ 所有连接测试失败，请检查配置")
    
    print("\n💡 建议:")
    print("1. 检查.env文件中的配置信息")
    print("2. 确认阿里云服务已开通")
    print("3. 验证AccessKey权限")
    print("4. 安装必要的Python包")

if __name__ == "__main__":
    main() 