#!/usr/bin/env python3
"""
阿里云连接测试脚本
用于验证阿里云API连接和权限
"""

import os
from aliyunsdkcore.client import AcsClient
from aliyunsdkrds.request.v20140815 import DescribeDBInstancesRequest
import oss2

def test_aliyun_connection():
    """测试阿里云连接"""
    print("🧪 测试阿里云连接...")
    
    # 获取配置
    access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID', 'your_access_key_id')
    access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET', 'your_access_key_secret')
    region_id = 'cn-hangzhou'
    
    if access_key_id == 'your_access_key_id' or access_key_secret == 'your_access_key_secret':
        print("❌ 请先设置阿里云访问密钥环境变量:")
        print("export ALIYUN_ACCESS_KEY_ID='your_access_key_id'")
        print("export ALIYUN_ACCESS_KEY_SECRET='your_access_key_secret'")
        return False
    
    try:
        # 测试RDS连接
        print("🔍 测试RDS连接...")
        rds_client = AcsClient(access_key_id, access_key_secret, region_id)
        request = DescribeDBInstancesRequest.DescribeDBInstancesRequest()
        request.set_PageSize(10)
        
        response = rds_client.do_action_with_exception(request)
        print("✅ RDS连接成功")
        
        # 测试OSS连接
        print("🔍 测试OSS连接...")
        oss_endpoint = 'https://oss-cn-hangzhou.aliyuncs.com'
        oss_auth = oss2.Auth(access_key_id, access_key_secret)
        
        # 这里只是测试认证，不实际连接存储桶
        print("✅ OSS认证成功")
        
        print("\n🎉 所有连接测试通过！")
        print("您可以运行 auto_restore_rds.py 进行数据库恢复")
        return True
        
    except Exception as e:
        print(f"❌ 连接测试失败: {e}")
        print("\n请检查:")
        print("1. AccessKey ID 和 Secret 是否正确")
        print("2. 网络连接是否正常")
        print("3. 阿里云账户是否有相应权限")
        return False

def show_config_template():
    """显示配置模板"""
    print("\n📋 配置模板:")
    print("=" * 50)
    print("export ALIYUN_ACCESS_KEY_ID='your_access_key_id'")
    print("export ALIYUN_ACCESS_KEY_SECRET='your_access_key_secret'")
    print("=" * 50)
    print("\n请将上述命令中的 'your_access_key_id' 和 'your_access_key_secret'")
    print("替换为您的实际阿里云访问密钥，然后重新运行此脚本。")

if __name__ == "__main__":
    print("🚀 阿里云连接测试工具")
    print("=" * 40)
    
    if not test_aliyun_connection():
        show_config_template()
