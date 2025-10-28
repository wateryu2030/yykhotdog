import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// POI类型枚举
export enum POIType {
  SCHOOL = 'school',
  TRAINING = 'training',
  LIBRARY = 'library',
  PARK = 'park',
  RESIDENTIAL = 'residential',
  MALL = 'mall',
  CINEMA = 'cinema',
  COMPETITOR = 'competitor',
  COMPLEMENTARY = 'complementary',
}

// 数据源枚举
export enum DataSource {
  AMAP = 'amap',
  BAIDU = 'baidu',
  MANUAL = 'manual',
}

// POI数据属性接口
export interface POIDataAttributes {
  id: number;
  poi_name: string;
  poi_type: POIType;
  longitude: number;
  latitude: number;
  address?: string;
  business_hours?: string;
  data_source: DataSource;
  created_at: Date;
}

// 创建POI数据时的可选属性
export interface POIDataCreationAttributes
  extends Optional<POIDataAttributes, 'id' | 'created_at'> {}

// POI数据模型类
export class POIData
  extends Model<POIDataAttributes, POIDataCreationAttributes>
  implements POIDataAttributes
{
  public id!: number;
  public poi_name!: string;
  public poi_type!: POIType;
  public longitude!: number;
  public latitude!: number;
  public address?: string;
  public business_hours?: string;
  public data_source!: DataSource;
  public created_at!: Date;

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 定义POI数据模型
POIData.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    poi_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    poi_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    business_hours: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    data_source: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'poi_data',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // POI数据不需要更新时间戳
    indexes: [
      {
        name: 'idx_type',
        fields: ['poi_type'],
      },
      {
        name: 'idx_coordinates',
        fields: ['longitude', 'latitude'],
      },
    ],
  }
);

export default POIData;
