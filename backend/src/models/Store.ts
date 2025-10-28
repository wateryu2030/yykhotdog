import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// 门店状态枚举
export enum StoreStatus {
  PLANNING = 'planning',
  CONSTRUCTION = 'construction',
  OPERATING = 'operating',
  CLOSED = 'closed',
}

// 门店类型枚举
export enum StoreType {
  DIRECT = 'direct',
  FRANCHISE = 'franchise',
  PARTNER = 'partner',
}

// 门店属性接口
export interface StoreAttributes {
  id: number;
  store_code: string;
  store_name: string;
  store_type: StoreType;
  status: StoreStatus;
  province: string;
  city: string;
  district: string;
  address: string;
  longitude?: number;
  latitude?: number;
  area_size?: number;
  rent_amount?: number;
  investment_amount?: number;
  expected_revenue?: number;
  created_at: Date;
  updated_at: Date;
  location?: string;
  coordinates?: { lat: number; lng: number };
}

// 创建门店时的可选属性
export interface StoreCreationAttributes
  extends Optional<StoreAttributes, 'id' | 'created_at' | 'updated_at'> {}

// 门店模型类
export class Store
  extends Model<StoreAttributes, StoreCreationAttributes>
  implements StoreAttributes
{
  public id!: number;
  public store_code!: string;
  public store_name!: string;
  public store_type!: StoreType;
  public status!: StoreStatus;
  public province!: string;
  public city!: string;
  public district!: string;
  public address!: string;
  public longitude?: number;
  public latitude?: number;
  public area_size?: number;
  public rent_amount?: number;
  public investment_amount?: number;
  public expected_revenue?: number;
  public created_at!: Date;
  public updated_at!: Date;
  public location?: string;
  public coordinates?: { lat: number; lng: number };

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 定义门店模型
Store.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    store_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    store_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    store_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    province: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(200),
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
    area_size: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    rent_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    investment_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    expected_revenue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'stores',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_location',
        fields: ['province', 'city', 'district'],
      },
      {
        name: 'idx_coordinates',
        fields: ['longitude', 'latitude'],
      },
      {
        name: 'idx_status',
        fields: ['status'],
      },
    ],
  }
);

export default Store;
