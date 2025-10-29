import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// 格式化金额数据，保留2位小数
const formatCurrency = (value: number): number => {
  return Number(Number(value).toFixed(2));
};

// 格式化数据，确保金额字段保留2位小数
const formatData = (data: any): any => {
  if (data && typeof data === 'object') {
    const formatted = { ...data };
    if (formatted.total_sales !== undefined) {
      formatted.total_sales = formatCurrency(formatted.total_sales);
    }
    if (formatted.avg_order_value !== undefined) {
      formatted.avg_order_value = formatCurrency(formatted.avg_order_value);
    }
    if (formatted.sales !== undefined) {
      formatted.sales = formatCurrency(formatted.sales);
    }
    return formatted;
  }
  return data;
};

// 获取所有城市列表
export const getCities = async (): Promise<any[]> => {
  const [rows] = await sequelize.query(
    `SELECT DISTINCT city_name as city FROM city WHERE delflag = 0 AND city_name IS NOT NULL AND city_name != '' ORDER BY city_name`,
    { type: QueryTypes.SELECT }
  );
  return rows as any[];
};

// 获取门店列表
export const getStores = async (): Promise<any[]> => {
  const [rows] = await sequelize.query(
    `SELECT s.id, s.shop_name, c.city_name as city, s.address, s.director, s.director_phone, s.is_use
     FROM shop s
     LEFT JOIN city c ON s.city_id = c.id
     WHERE s.delflag = 0 AND s.shop_name IS NOT NULL AND s.shop_name != ''
     ORDER BY c.city_name, s.shop_name`,
    { type: QueryTypes.SELECT }
  );
  return rows as any[];
};

// 城市画像统计
export const getCityDetails = async (city: string) => {
  try {
    console.log('开始查询城市详情:', city);

    // 根据城市名称获取正确的城市名称
    let cityName = '沈阳市'; // 默认沈阳市
    if (city.includes('沈阳')) {
      cityName = '沈阳市';
    } else if (city.includes('大连')) {
      cityName = '大连市';
    } else if (city.includes('鞍山')) {
      cityName = '鞍山市';
    } else if (city.includes('抚顺')) {
      cityName = '抚顺市';
    } else if (city.includes('本溪')) {
      cityName = '本溪市';
    } else if (city.includes('丹东')) {
      cityName = '丹东市';
    } else if (city.includes('锦州')) {
      cityName = '锦州市';
    } else if (city.includes('营口')) {
      cityName = '营口市';
    } else if (city.includes('阜新')) {
      cityName = '阜新市';
    } else if (city.includes('辽阳')) {
      cityName = '辽阳市';
    } else if (city.includes('盘锦')) {
      cityName = '盘锦市';
    } else if (city.includes('铁岭')) {
      cityName = '铁岭市';
    } else if (city.includes('朝阳')) {
      cityName = '朝阳市';
    } else if (city.includes('葫芦岛')) {
      cityName = '葫芦岛市';
    }

    // 基础统计信息 - 使用正确的数据库和表名
    const basicStats = await sequelize.query(
      `SELECT
        COUNT(DISTINCT co.customer_id) AS total_customers,
        COUNT(*) AS total_orders,
        SUM(co.total_amount) AS total_sales,
        AVG(co.total_amount) AS avg_order_value
      FROM customer_order co
      JOIN shop s ON co.shop_id = s.id
      JOIN city c ON s.city_id = c.id
      WHERE c.city_name = :cityName 
        AND co.delflag = 0 
        AND s.delflag = 0
        AND c.delflag = 0
        AND co.total_amount > 0
        AND co.customer_id IS NOT NULL
        AND co.customer_id != ''`,
      {
        type: QueryTypes.SELECT,
        replacements: { cityName: cityName },
      }
    );

    console.log('查询结果:', basicStats);

    if (!basicStats || basicStats.length === 0) {
      console.log('没有找到数据，返回空结果');
      return {
        total_customers: 0,
        total_orders: 0,
        total_sales: 0,
        avg_order_value: 0,
        topProductsBySales: [],
        topProductsByQuantity: [],
      };
    }

    const stats = basicStats[0] as any;

    // 热门商品（按销售额）
    const topProductsBySales = await sequelize.query(
      `SELECT TOP 10
        og.goodsName as name,
        SUM(og.goodsTotal) as sales,
        COUNT(DISTINCT og.orderId) as order_count,
        SUM(og.goodsNumber) as total_quantity,
        AVG(og.goodsPrice) as avg_price,
        (SUM(og.goodsTotal) / (SELECT SUM(og2.goodsTotal) FROM order_goods og2 
         JOIN customer_order co2 ON 'ORD' + CAST(og2.orderId AS NVARCHAR(20)) = co2.order_no
         JOIN shop s2 ON co2.shop_id = s2.id
         JOIN city c2 ON s2.city_id = c2.id
         WHERE c2.city_name = :cityName AND og2.delflag = 0 AND co2.delflag = 0 AND s2.delflag = 0 AND c2.delflag = 0
           AND co2.total_amount > 0 AND co2.customer_id IS NOT NULL AND co2.customer_id != '')) * 100 as percentage
      FROM order_goods og
      JOIN customer_order co ON 'ORD' + CAST(og.orderId AS NVARCHAR(20)) = co.order_no
      JOIN shop s ON co.shop_id = s.id
      JOIN city c ON s.city_id = c.id
      WHERE c.city_name = :cityName 
        AND og.delflag = 0 
        AND co.delflag = 0 
        AND s.delflag = 0
        AND c.delflag = 0
        AND co.total_amount > 0
        AND co.customer_id IS NOT NULL
        AND co.customer_id != ''
      GROUP BY og.goodsName
      ORDER BY sales DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { cityName: cityName },
      }
    );

    // 热门商品（按数量）
    const topProductsByQuantity = await sequelize.query(
      `SELECT TOP 10
        og.goodsName as name,
        SUM(og.goodsTotal) as sales,
        COUNT(DISTINCT og.orderId) as order_count,
        SUM(og.goodsNumber) as total_quantity,
        AVG(og.goodsPrice) as avg_price,
        (SUM(og.goodsNumber) / (SELECT SUM(og2.goodsNumber) FROM order_goods og2 
         JOIN customer_order co2 ON 'ORD' + CAST(og2.orderId AS NVARCHAR(20)) = co2.order_no
         JOIN shop s2 ON co2.shop_id = s2.id
         JOIN city c2 ON s2.city_id = c2.id
         WHERE c2.city_name = :cityName AND og2.delflag = 0 AND co2.delflag = 0 AND s2.delflag = 0 AND c2.delflag = 0
           AND co2.total_amount > 0 AND co2.customer_id IS NOT NULL AND co2.customer_id != '')) * 100 as percentage
      FROM order_goods og
      JOIN customer_order co ON 'ORD' + CAST(og.orderId AS NVARCHAR(20)) = co.order_no
      JOIN shop s ON co.shop_id = s.id
      JOIN city c ON s.city_id = c.id
      WHERE c.city_name = :cityName 
        AND og.delflag = 0 
        AND co.delflag = 0 
        AND s.delflag = 0
        AND c.delflag = 0
        AND co.total_amount > 0
        AND co.customer_id IS NOT NULL
        AND co.customer_id != ''
      GROUP BY og.goodsName
      ORDER BY total_quantity DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { cityName: cityName },
      }
    );

    return formatData({
      total_customers: stats.total_customers || 0,
      total_orders: stats.total_orders || 0,
      total_sales: stats.total_sales || 0,
      avg_order_value: stats.avg_order_value || 0,
      topProductsBySales: topProductsBySales || [],
      topProductsByQuantity: topProductsByQuantity || [],
    });
  } catch (error) {
    console.error('获取城市详情失败:', error);
    return {
      total_customers: 0,
      total_orders: 0,
      total_sales: 0,
      avg_order_value: 0,
      topProductsBySales: [],
      topProductsByQuantity: [],
    };
  }
};

// 城市对比
export const getCityComparison = async (cities: string[]) => {
  const rows = await sequelize.query(
    `SELECT 
      c.city_name as city,
      COUNT(DISTINCT co.customer_id) AS total_customers,
      COUNT(*) AS total_orders,
      SUM(co.total_amount) AS total_sales,
      AVG(co.total_amount) AS avg_order_value
    FROM city c
    LEFT JOIN shop s ON c.id = s.city_id
    LEFT JOIN customer_order co ON s.id = co.shop_id 
      AND co.delflag = 0 
      AND co.total_amount > 0
      AND co.customer_id IS NOT NULL
      AND co.customer_id != ''
    WHERE c.delflag = 0
      AND s.delflag = 0
      AND c.city_name IN (:cityNames)
    GROUP BY c.city_name
    ORDER BY total_sales DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { cityNames: cities },
    }
  );

  // 格式化返回数据
  return (rows as any[]).map(row => formatData(row));
};

// 门店增长曲线
export const getShopGrowth = async (city: string) => {
  // 根据城市名称获取正确的城市名称
  let cityName = '沈阳市'; // 默认沈阳市
  if (city.includes('沈阳')) {
    cityName = '沈阳市';
  } else if (city.includes('大连')) {
    cityName = '大连市';
  } else if (city.includes('鞍山')) {
    cityName = '鞍山市';
  } else if (city.includes('抚顺')) {
    cityName = '抚顺市';
  } else if (city.includes('本溪')) {
    cityName = '本溪市';
  } else if (city.includes('丹东')) {
    cityName = '丹东市';
  } else if (city.includes('锦州')) {
    cityName = '锦州市';
  } else if (city.includes('营口')) {
    cityName = '营口市';
  } else if (city.includes('阜新')) {
    cityName = '阜新市';
  } else if (city.includes('辽阳')) {
    cityName = '辽阳市';
  } else if (city.includes('盘锦')) {
    cityName = '盘锦市';
  } else if (city.includes('铁岭')) {
    cityName = '铁岭市';
  } else if (city.includes('朝阳')) {
    cityName = '朝阳市';
  } else if (city.includes('葫芦岛')) {
    cityName = '葫芦岛市';
  }

  const rows = await sequelize.query(
    `SELECT
      CONVERT(VARCHAR(10), co.order_date, 120) AS date,
      COUNT(DISTINCT co.customer_id) AS customers,
      COUNT(*) AS orders,
      SUM(co.total_amount) AS sales
    FROM customer_order co
    JOIN shop s ON co.shop_id = s.id
    JOIN city c ON s.city_id = c.id
    WHERE c.city_name = :cityName 
      AND co.delflag = 0 
      AND s.delflag = 0
      AND c.delflag = 0
      AND co.total_amount > 0
      AND co.customer_id IS NOT NULL
      AND co.customer_id != ''
    GROUP BY CONVERT(VARCHAR(10), co.order_date, 120)
    ORDER BY date`,
    {
      type: QueryTypes.SELECT,
      replacements: { cityName: cityName },
    }
  );

  // 格式化返回数据
  return (rows as any[]).map(row => formatData(row));
};

// 门店组成
export const getShopComposition = async (city: string) => {
  const rows = await sequelize.query(
    `SELECT s.ShopName, COUNT(o.id) AS order_count, SUM(o.total) AS total_sales
    FROM Shop s
    LEFT JOIN Orders o ON s.Id = o.shopId 
      AND o.delflag = 0
      AND o.total > 0 
      AND o.total < 1000
      AND o.clientUserId IS NOT NULL
      AND o.clientUserId != ''
    WHERE s.city = :cityName AND s.Delflag = 0
    GROUP BY s.ShopName
    ORDER BY total_sales DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { cityName: city },
    }
  );

  // 格式化返回数据
  return (rows as any[]).map(row => formatData(row));
};

// 门店对比
export const getShopComparison = async (city: string) => {
  const rows = await sequelize.query(
    `SELECT s.ShopName, COUNT(o.id) AS order_count, SUM(o.total) AS total_sales
    FROM shop s
    LEFT JOIN Orders o ON s.Id = o.shopId AND o.delflag = 0
    WHERE s.city = :cityName AND s.Delflag = 0
    GROUP BY s.ShopName
    ORDER BY total_sales DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { cityName: city },
    }
  );
  return rows as any[];
};

// 客户分布
export const getCustomerDistribution = async (city: string) => {
  // 根据城市名称获取城市ID
  let cityId = 32; // 默认沈阳市
  if (city.includes('沈阳')) {
    cityId = 32;
  } else if (city.includes('大连')) {
    cityId = 33;
  } else if (city.includes('鞍山')) {
    cityId = 34;
  } else if (city.includes('抚顺')) {
    cityId = 35;
  } else if (city.includes('本溪')) {
    cityId = 36;
  } else if (city.includes('丹东')) {
    cityId = 37;
  } else if (city.includes('锦州')) {
    cityId = 38;
  } else if (city.includes('营口')) {
    cityId = 39;
  } else if (city.includes('阜新')) {
    cityId = 40;
  } else if (city.includes('辽阳')) {
    cityId = 41;
  } else if (city.includes('盘锦')) {
    cityId = 42;
  } else if (city.includes('铁岭')) {
    cityId = 43;
  } else if (city.includes('朝阳')) {
    cityId = 44;
  } else if (city.includes('葫芦岛')) {
    cityId = 45;
  }

  const rows = await sequelize.query(
    `SELECT 
      CASE
        WHEN o.total >= 50 THEN '高价值客户'
        WHEN o.total >= 20 THEN '中价值客户'
        ELSE '普通客户'
      END AS segment,
      COUNT(*) AS count
    FROM Orders o
    JOIN shop s ON o.shopId = s.Id
    WHERE s.city = :cityName AND o.delflag = 0 AND s.Delflag = 0
    GROUP BY 
      CASE
        WHEN o.total >= 50 THEN '高价值客户'
        WHEN o.total >= 20 THEN '中价值客户'
        ELSE '普通客户'
      END
    ORDER BY 
      CASE 
        WHEN CASE
          WHEN o.total >= 50 THEN '高价值客户'
          WHEN o.total >= 20 THEN '中价值客户'
          ELSE '普通客户'
        END = '高价值客户' THEN 1
        WHEN CASE
          WHEN o.total >= 50 THEN '高价值客户'
          WHEN o.total >= 20 THEN '中价值客户'
          ELSE '普通客户'
        END = '中价值客户' THEN 2
        ELSE 3
      END`,
    {
      type: QueryTypes.SELECT,
      replacements: { cityName: city },
    }
  );

  return rows as any[];
};
