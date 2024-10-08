// src/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import { UserOutlined, FileTextOutlined } from '@ant-design/icons';
import axiosInstance from '../services/axiosConfig';
import WordCloud from 'react-wordcloud';
import styles from "@/scss/Statistics.module.scss"
const { Title } = Typography;

// Register required componentsy for Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const Dashboard = () => {
  const [userData, setUserData] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [wordCloudData, setWordCloudData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userResponse, statsResponse, filesResponse, wordcloudResponse] = await Promise.all([
          axiosInstance.get('/api/admin/normal-users'),
          axiosInstance.get('/api/usage-statistics'),
          axiosInstance.get('/api/filelist'),
          axiosInstance.get('/api/wordcloud-data')
        ]);
        setTotalUsers(userResponse.data.length);
        setUserData(statsResponse.data);
        setTotalFiles(filesResponse.data.file_info.length);
        setWordCloudData(Object.entries(wordcloudResponse.data).map(([text, value]) => ({ text, value })));
      } catch (error) {
        console.error('Error fetching the data', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    console.log('UserData:', userData); // Log userData to check format
  }, [userData]);

  // Generate random colors for each user
  const generateRandomColor = (alpha = 0.8) => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${alpha})`;
  };

  const colors = userData.map(() => generateRandomColor(0.6));
  const borderColors = colors.map(color => color.replace(/0\.6\)$/, '1)'));

  // Prepare data for the chart
  const data = {
    labels: userData.map(user => user.username),
    datasets: [
      {
        label: 'Number of Uses',
        data: userData.map(user => user.usage_count),
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };


  return (
    <div>
      <Row gutter={[20, 16]} justify="center">
        <Col xs={24} md={12}>
          <Card className={styles.card}>
            <Row align="middle">
              <Col flex="auto">
                <Title level={4}>Total Users</Title>
                <Title level={2}>{totalUsers}</Title>
              </Col>
              <Col>
                <UserOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className={styles.card}>
            <Row align="middle">
              <Col flex="auto">
                <Title level={4}>Total Files Uploaded</Title>
                <Title level={2}>{totalFiles}</Title>
              </Col>
              <Col>
                <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      <Row gutter={[20, 16]} justify="center" style={{ marginTop: '30px' }}>
        <Col xs={24} md={12}>
          <Card className={styles.card}>
            <Title level={4}>Chatbot Usage Statistics</Title>
            <div style={{ height: '400px' }}>
              <Bar data={data} options={options} />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className={styles.card}>
            <Title level={4}>Keyword Wordcloud</Title>
            <div style={{ height: '400px' }}>
              <WordCloud words={wordCloudData} options={{ colors: colors.map(color => color.replace(/0\.6\)$/, '1)')), enableTooltip: true, deterministic: false, fontFamily: 'impact', fontSizes: [15, 60], fontWeight: 'bold', padding: 1, rotations: 3, rotationAngles: [-90, 0], scale: 'sqrt', spiral: 'archimedean', transitionDuration: 1000 }} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;