#!/usr/bin/env python3
"""
阿里云配置模板
请根据您的实际情况修改以下配置
"""

# 阿里云访问密钥配置
# 请从阿里云控制台获取您的AccessKey ID和AccessKey Secret
ALIYUN_CONFIG = {
    'access_key_id': 'your_access_key_id',  # 请替换为您的AccessKey ID
    'access_key_secret': 'your_access_key_secret',  # 请替换为您的AccessKey Secret
    'region_id': 'cn-hangzhou',  # 根据您的RDS实例所在区域修改
}

# RDS实例配置
RDS_CONFIG = {
    'instance_id': 'rm-uf660d00xovkm3067',  # 您的RDS实例ID
    'databases': ['cyrg2025', 'hotdog2030'],  # 要恢复的数据库列表
}

# OSS存储配置
OSS_CONFIG = {
    'endpoint': 'https://oss-cn-hangzhou.aliyuncs.com',  # 根据您的OSS区域修改
    'bucket_name': 'your-backup-bucket',  # 请替换为您的OSS存储桶名称
    'backup_prefix': 'backups/',  # 备份文件在OSS中的前缀路径
}

# 备份文件配置
BACKUP_FILES = {
    'cyrg2025': {
        'local_path': '/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak',
        'oss_key': 'backups/cyrg2025-10-24.bak',
        'target_database': 'cyrg2025'
    },
    'hotdog2030': {
        'local_path': '/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak',
        'oss_key': 'backups/zhkj2025-10-24.bak',
        'target_database': 'hotdog2030'
    }
}

def get_config():
    """获取配置信息"""
    return {
        'aliyun': ALIYUN_CONFIG,
        'rds': RDS_CONFIG,
        'oss': OSS_CONFIG,
        'backups': BACKUP_FILES
    }

if __name__ == "__main__":
    import json
    config = get_config()
    print("当前配置:")
    print(json.dumps(config, indent=2, ensure_ascii=False))
