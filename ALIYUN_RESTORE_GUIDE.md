# 阿里云RDS自动化恢复指南

## 概述
本指南将帮助您通过阿里云API自动上传备份文件到OSS并触发RDS恢复操作。

## 前置条件

### 1. 阿里云访问密钥
您需要从阿里云控制台获取以下信息：
- AccessKey ID
- AccessKey Secret
- RDS实例ID
- OSS存储桶名称

### 2. 环境准备
```bash
# 设置环境变量
export ALIYUN_ACCESS_KEY_ID='your_access_key_id'
export ALIYUN_ACCESS_KEY_SECRET='your_access_key_secret'
```

## 配置步骤

### 1. 修改配置文件
编辑 `aliyun_config.py` 文件，更新以下配置：

```python
# 阿里云访问密钥
ALIYUN_CONFIG = {
    'access_key_id': 'your_actual_access_key_id',
    'access_key_secret': 'your_actual_access_key_secret',
    'region_id': 'cn-hangzhou',  # 根据您的RDS实例区域修改
}

# OSS存储配置
OSS_CONFIG = {
    'endpoint': 'https://oss-cn-hangzhou.aliyuncs.com',  # 根据您的OSS区域修改
    'bucket_name': 'your-actual-bucket-name',  # 您的OSS存储桶名称
}
```

### 2. 创建OSS存储桶
如果还没有OSS存储桶，请：
1. 登录阿里云控制台
2. 进入OSS服务
3. 创建存储桶用于存放备份文件
4. 记录存储桶名称和区域

## 使用方法

### 1. 检查配置
```bash
cd /Users/apple/Ahope/yykhotdog
python3 aliyun_config.py
```

### 2. 运行恢复脚本
```bash
python3 auto_restore_rds.py
```

## 脚本功能

### 主要功能
1. **检查RDS实例状态** - 验证RDS实例是否可用
2. **上传备份文件到OSS** - 自动上传.bak文件到OSS存储桶
3. **触发数据库恢复** - 通过阿里云API触发RDS恢复操作
4. **监控恢复进度** - 等待并监控恢复完成状态

### 恢复流程
1. 上传 `cyrg2025-10-24.bak` 到OSS
2. 恢复 `cyrg2025` 数据库
3. 上传 `zhkj2025-10-24.bak` 到OSS
4. 恢复 `hotdog2030` 数据库

## 故障排除

### 常见问题

#### 1. 访问密钥错误
```
❌ RDS实例检查失败: InvalidAccessKeyId.NotFound
```
**解决方案**: 检查AccessKey ID和Secret是否正确

#### 2. OSS存储桶不存在
```
❌ 备份文件上传失败: NoSuchBucket
```
**解决方案**: 检查OSS存储桶名称和区域是否正确

#### 3. 权限不足
```
❌ 数据库恢复失败: Forbidden.RAM
```
**解决方案**: 确保AccessKey具有RDS和OSS的完整权限

### 权限要求
您的AccessKey需要以下权限：
- `AliyunRDSFullAccess` - RDS完全访问权限
- `AliyunOSSFullAccess` - OSS完全访问权限

## 手动恢复方案

如果自动化脚本遇到问题，您也可以手动操作：

### 1. 通过阿里云控制台
1. 登录阿里云RDS控制台
2. 选择您的RDS实例
3. 进入"备份恢复"页面
4. 上传备份文件并执行恢复

### 2. 通过OSS控制台
1. 登录阿里云OSS控制台
2. 上传备份文件到存储桶
3. 在RDS控制台中使用OSS路径进行恢复

## 验证恢复结果

恢复完成后，运行以下脚本验证数据：

```bash
python3 check_rds_data.py
```

应该看到数据库中有数据记录。

## 注意事项

1. **备份文件大小**: 备份文件较大(317MB + 171MB)，上传可能需要一些时间
2. **网络稳定性**: 确保网络连接稳定，避免上传中断
3. **存储费用**: OSS存储会产生少量费用
4. **恢复时间**: 数据库恢复可能需要几分钟到几十分钟
5. **业务影响**: 恢复过程中RDS实例可能暂时不可用

## 联系支持

如果遇到问题，请检查：
1. 阿里云访问密钥是否正确
2. RDS实例状态是否正常
3. OSS存储桶是否存在
4. 网络连接是否稳定
