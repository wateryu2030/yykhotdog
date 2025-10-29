import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Select, Button, Space, Typography, Tooltip, Progress, Modal, Table } from 'antd';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  FullscreenOutlined
} from '@ant-design/icons';
import { api } from '../config/api';
import dayjs from 'dayjs';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const { Title: AntTitle, Text } = Typography;
const { Option } = Select;

interface EnhancedChartProps {
  data: any;
  type: 'line' | 'bar';
  title: string;
  height?: number;
  showDataTable?: boolean;
  enableFullscreen?: boolean;
  onDataPointClick?: (data: any) => void;
  customTooltip?: (context: any) => string;
}

const EnhancedChart: React.FC<EnhancedChartProps> = ({
  data,
  type,
  title,
  height = 400,
  showDataTable = false,
  enableFullscreen = false,
  onDataPointClick,
  customTooltip
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const chartRef = useRef<any>(null);

  // 增强的图表配置
  const enhancedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        },
        padding: 20
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function(context: any) {
            if (customTooltip) {
              return customTooltip(context);
            }
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}`;
          },
          afterLabel: function(context: any) {
            // 添加额外的信息
            const dataset = context.dataset;
            const index = context.dataIndex;
            if (dataset.data && dataset.data[index]) {
              const dataPoint = dataset.data[index];
              if (typeof dataPoint === 'object' && dataPoint.additionalInfo) {
                return dataPoint.additionalInfo;
              }
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '时间/类别',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '数值',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0 && onDataPointClick) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const dataset = data.datasets[datasetIndex];
        const dataPoint = {
          label: data.labels[dataIndex],
          dataset: dataset.label,
          value: dataset.data[dataIndex],
          index: dataIndex,
          datasetIndex: datasetIndex
        };
        setSelectedDataPoint(dataPoint);
        onDataPointClick(dataPoint);
      }
    },
    onHover: (event: any, elements: any) => {
      if (chartRef.current) {
        chartRef.current.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  };

  // 处理全屏
  const handleFullscreen = () => {
    setIsFullscreen(true);
    setShowModal(true);
  };

  // 处理数据导出
  const handleExport = () => {
    if (!data) return;
    
    const csvContent = [
      ['标签', ...data.datasets.map((dataset: any) => dataset.label)],
      ...data.labels.map((label: string, index: number) => [
        label,
        ...data.datasets.map((dataset: any) => dataset.data[index] || 0)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 生成数据表格
  const generateTableData = () => {
    if (!data) return [];
    
    return data.labels.map((label: string, index: number) => {
      const row: any = { key: index, label };
      data.datasets.forEach((dataset: any) => {
        row[dataset.label] = dataset.data[index] || 0;
      });
      return row;
    });
  };

  const tableColumns = data ? [
    { title: '标签', dataIndex: 'label', key: 'label' },
    ...data.datasets.map((dataset: any) => ({
      title: dataset.label,
      dataIndex: dataset.label,
      key: dataset.label,
      render: (value: number) => typeof value === 'number' ? value.toFixed(2) : value
    }))
  ] : [];

  const ChartComponent = type === 'line' ? Line : Bar;

  return (
    <>
      <Card
        title={
          <Space>
            <span>{title}</span>
            {enableFullscreen && (
              <Button
                type="text"
                icon={<FullscreenOutlined />}
                onClick={handleFullscreen}
                size="small"
              />
            )}
            {showDataTable && (
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => setShowModal(true)}
                size="small"
              />
            )}
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              size="small"
            />
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">点击数据点查看详情</Text>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
              size="small"
            />
          </Space>
        }
      >
        <div style={{ height: height, position: 'relative' }}>
          <ChartComponent
            ref={chartRef}
            data={data}
            options={enhancedOptions}
          />
        </div>
        
        {selectedDataPoint && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="选中标签"
                  value={selectedDataPoint.label}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="数据集"
                  value={selectedDataPoint.dataset}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="数值"
                  value={selectedDataPoint.value}
                  precision={2}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Card>

      {/* 全屏/数据表格模态框 */}
      <Modal
        title={title}
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setIsFullscreen(false);
        }}
        width={isFullscreen ? '90vw' : '80vw'}
        footer={null}
        destroyOnClose
      >
        {isFullscreen ? (
          <div style={{ height: '70vh' }}>
            <ChartComponent
              data={data}
              options={{
                ...enhancedOptions,
                responsive: true,
                maintainAspectRatio: false
              }}
            />
          </div>
        ) : (
          <Table
            dataSource={generateTableData()}
            columns={tableColumns}
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        )}
      </Modal>
    </>
  );
};

export default EnhancedChart;
