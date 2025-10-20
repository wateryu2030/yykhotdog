import React from 'react';
import { Row, Col } from 'antd';
import InsightsPanel from '../components/InsightsPanel';

export default function InsightsPage(){
  return (
    <div style={{padding:20}}>
      <Row gutter={16}>
        <Col span={12}>
          <InsightsPanel defaultScope="city" />
        </Col>
        <Col span={12}>
          <InsightsPanel defaultScope="store" />
        </Col>
      </Row>
    </div>
  );
}
