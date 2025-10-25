import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Cascader, 
  Select,
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography, 
  Spin, 
  message,
  Checkbox,
  Input,
  Divider,
  Statistic
} from 'antd';

import { 
  EnvironmentOutlined, 
  SearchOutlined, 
  CheckCircleOutlined,
  InfoCircleOutlined,
  SaveOutlined
} from '@ant-design/icons';

const { Option } = Select;

const { Title, Text } = Typography;

interface School {
  id: number;
  school_name: string;
  school_type: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  student_count: number;
  teacher_count: number;
  established_year: number;
  school_level: string;
  contact_phone: string;
  website: string;
  description: string;
}

interface RegionOption {
  value: string;
  label: string;
  isLeaf?: boolean;
  children?: RegionOption[];
}

const NewSiteSelection: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<string>('all');

  // 获取地区级联数据
  useEffect(() => {
    fetchRegionData();
  }, []);

  const fetchRegionData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/region/cascade');
      const data = await response.json();
      if (data.success) {
        // 转换数据格式为Cascader需要的格式
        const convertToCascaderFormat = (regions: any[]): any[] => {
          return regions.map(region => ({
            value: region.value,
            label: region.label,
            isLeaf: region.level === 3, // 区县级别是叶子节点
            children: region.children && region.children.length > 0 
              ? convertToCascaderFormat(region.children) 
              : undefined
          }));
        };
        setRegionOptions(convertToCascaderFormat(data.data));
      }
    } catch (error) {
      console.error('获取地区数据失败:', error);
      message.error('获取地区数据失败');
    }
  };

  // 根据选择的地区查询学校
  const fetchSchools = async (useAmap: boolean = false) => {
    if (selectedRegion.length < 3) {
      message.warning('请选择完整的省市区县');
      return;
    }

    setLoading(true);
    try {
      // selectedRegion是选中的值数组，如['11', '1101', '110101']
      // 我们需要根据这些值找到对应的地区名称
      const [provinceCode, cityCode, districtCode] = selectedRegion;
      
      // 从regionOptions中查找对应的地区名称
      const findRegionName = (code: string, regions: any[]): string => {
        for (const region of regions) {
          if (region.value === code) {
            return region.label;
          }
          if (region.children) {
            const found = findRegionName(code, region.children);
            if (found) return found;
          }
        }
        return '';
      };

      const province = findRegionName(provinceCode, regionOptions);
      const city = findRegionName(cityCode, regionOptions);
      const district = findRegionName(districtCode, regionOptions);

      const params = new URLSearchParams();
      if (province) params.append('province', province);
      if (city) params.append('city', city);
      if (district) params.append('district', district);
      if (useAmap) params.append('useAmap', 'true');

      const response = await fetch(`http://localhost:3001/api/school-management/schools?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setSchools(data.data);
        setFilteredSchools(data.data);
        setSelectedSchools([]);
        if (useAmap && data.data.length > 0) {
          message.success(`从高德地图获取到 ${data.data.length} 所学校`);
        } else if (data.data.length > 0) {
          message.success(`找到 ${data.data.length} 所学校`);
        } else {
          message.info('该地区暂无学校数据，可以尝试从高德地图获取');
        }
      } else {
        message.error('查询学校失败');
      }
    } catch (error) {
      console.error('查询学校失败:', error);
      message.error('查询学校失败');
    } finally {
      setLoading(false);
    }
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSchools(filteredSchools.map(school => school.id));
    } else {
      setSelectedSchools([]);
    }
  };

  // 保存选择的学校
  const saveSelectedSchools = async () => {
    if (selectedSchools.length === 0) {
      message.warning('请先选择学校');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/school-management/selected-schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user123', // 这里应该从用户状态获取
          schoolIds: selectedSchools,
        }),
      });

      const data = await response.json();
      if (data.success) {
        message.success(`成功保存 ${selectedSchools.length} 所学校的选择`);
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      console.error('保存学校选择失败:', error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '学校名称',
      dataIndex: 'school_name',
      key: 'school_name',
      width: 200,
      render: (text: string, record: School) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.school_type} | {record.school_level}
          </div>
        </div>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: '学生人数',
      dataIndex: 'student_count',
      key: 'student_count',
      width: 100,
      render: (count: number) => (
        <Tag color={count >= 500 ? 'green' : 'default'}>
          {count || '未知'}
        </Tag>
      ),
    },
    {
      title: '教师人数',
      dataIndex: 'teacher_count',
      key: 'teacher_count',
      width: 100,
      render: (count: number) => count || '未知',
    },
    {
      title: '建校年份',
      dataIndex: 'established_year',
      key: 'established_year',
      width: 100,
      render: (year: number) => year || '未知',
    },
    {
      title: '联系方式',
      dataIndex: 'contact_phone',
      key: 'contact_phone',
      width: 120,
      render: (phone: string) => phone || '未知',
    },
  ];

  // 统计信息
  const stats = {
    total: filteredSchools.length,
    selected: selectedSchools.length,
    over500: filteredSchools.filter(s => s.student_count >= 500).length,
    selectedOver500: selectedSchools.filter(id => {
      const school = schools.find(s => s.id === id);
      return school && school.student_count >= 500;
    }).length,
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card>
        <Title level={2}>
          <EnvironmentOutlined style={{ marginRight: '8px' }} />
          智能选店系统
        </Title>
        
        {/* 地区选择 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Text strong>选择地区：</Text>
            </Col>
            <Col span={12}>
              <Cascader
                style={{ width: '100%' }}
                placeholder="请选择省市区县"
                value={selectedRegion}
                onChange={setSelectedRegion}
                options={regionOptions}
                showSearch
                allowClear
                changeOnSelect
                displayRender={(labels) => labels.join(' / ')}
              />
            </Col>
            <Col span={6}>
              <Space>
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  onClick={() => fetchSchools(false)}
                  loading={loading}
                  disabled={selectedRegion.length < 3}
                >
                  查询学校
                </Button>
                <Button 
                  type="default" 
                  icon={<EnvironmentOutlined />}
                  onClick={() => fetchSchools(true)}
                  loading={loading}
                  disabled={selectedRegion.length < 3}
                >
                  从高德地图获取
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 统计信息 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总学校数" value={stats.total} />
            </Col>
            <Col span={6}>
              <Statistic title="已选择" value={stats.selected} valueStyle={{ color: '#1890ff' }} />
            </Col>
            <Col span={6}>
              <Statistic title="500人以上" value={stats.over500} valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col span={6}>
              <Statistic title="已选500人以上" value={stats.selectedOver500} valueStyle={{ color: '#f5222d' }} />
            </Col>
          </Row>
        </Card>

        {/* 筛选和操作 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Input
                placeholder="搜索学校名称"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="学校类型"
                value={schoolTypeFilter}
                onChange={setSchoolTypeFilter}
              >
                <Option value="all">全部类型</Option>
                <Option value="小学">小学</Option>
                <Option value="初中">初中</Option>
                <Option value="高中">高中</Option>
                <Option value="职业学校">职业学校</Option>
                <Option value="大学">大学</Option>
                <Option value="培训机构">培训机构</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Space>
                <Checkbox
                  checked={selectedSchools.length === filteredSchools.length && filteredSchools.length > 0}
                  indeterminate={selectedSchools.length > 0 && selectedSchools.length < filteredSchools.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  全选
                </Checkbox>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  onClick={saveSelectedSchools}
                  disabled={selectedSchools.length === 0}
                >
                  保存选择 ({selectedSchools.length})
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 学校列表 */}
        <Card>
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={filteredSchools}
              rowKey="id"
              rowSelection={{
                selectedRowKeys: selectedSchools,
                onChange: (selectedRowKeys: React.Key[]) => {
                  setSelectedSchools(selectedRowKeys as number[]);
                },
                onSelectAll: (selected, selectedRows, changeRows) => {
                  if (selected) {
                    const newSelected = [...selectedSchools, ...changeRows.map(row => row.id)];
                    setSelectedSchools(Array.from(new Set(newSelected)));
                  } else {
                    const changeIds = changeRows.map(row => row.id);
                    setSelectedSchools(selectedSchools.filter(id => !changeIds.includes(id)));
                  }
                }
              }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
              scroll={{ x: 1000 }}
            />
          </Spin>
        </Card>
      </Card>
    </div>
  );
};

export default NewSiteSelection;