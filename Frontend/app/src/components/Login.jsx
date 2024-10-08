import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Modal, Typography, message, Radio } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SmileOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../scss/LoginSingupFrom.scss'; // Assuming you will create a CSS file for custom styles
import { useAuth } from '../AuthContext';

const { Title, Text } = Typography;

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const onFinish = async (values) => {
    console.log('Received values of form: ', values);

    const {...loginData } = values;
    // loginData.is_admin = role === 'admin';

    try {
      const response = await axios.post('http://localhost:8080/login', loginData);
      console.log(response)
      const {access_token,is_admin,id,org_id}=response.data
      login(access_token, is_admin,id,org_id)
      if (is_admin) {
        message.success('Login successful');
        navigate('/admin-dashboard');
      } else if (!is_admin) {
        message.success('Login successful');
        navigate('/homepage');
      } else {
        message.error('Role mismatch. Please select the correct role.');
      }
    } catch (error) {
      console.error('Failed to login:', error);
      message.error('Login failed. Please check your credentials.');
    }
  };

  const onFinishResetPassword = async (values) => {
    console.log('Received values of reset password form: ', values);
    try {
      const response = await axios.post('http://localhost:8080/request-reset-password', values);
      message.success(response.data.message);
      handleOk();
    } catch (error) {
      console.error('Failed to reset password:', error);
      message.error('Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <SmileOutlined style={{ fontSize: '32px', marginRight: '10px', color: '#40a9ff' }} />
          <Title level={2} style={{ color: '#ffffff', display: 'inline-block' }}>Welcome to X-chat</Title>
        </div>
        <Text style={{ display: 'block', textAlign: 'center', marginBottom: '20px', color: '#ffffff' }}>
          Your ultimate AI assistant platform
        </Text>
        <Form
          name="login"
          className="login-form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            // rules={[{ required: true, message: 'Please input your Email!', type: 'email' }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              addonBefore={<UserOutlined />}
              placeholder="username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input
              prefix={<LockOutlined className="site-form-item-icon" />}
              addonBefore={<LockOutlined />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>
          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox style={{ color: '#ffffff', float: 'left' }}>Remember me</Checkbox>
            </Form.Item>

            {/* <a className="login-form-forgot" onClick={showModal} style={{ float: 'right', color: '#ffffff', cursor: 'pointer' }}>
              Forgot password
            </a> */}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="login-form-button">
              Log in
            </Button>
            <div style={{ textAlign: 'center', color: '#ffffff' }}>
              Or <a href="/register" style={{ color: '#40a9ff' }}>register now!</a>
            </div>
          </Form.Item>
        </Form>
      </div>

      <Modal title="Reset Password" visible={isModalVisible} onCancel={handleCancel} footer={null}>
        <Form
          name="reset_password"
          onFinish={onFinishResetPassword}
        >
          <Form.Item
            name="email"
            // rules={[
            //   {
            //     type: 'email',
            //     message: 'The input is not valid E-mail!',
            //   },
            //   {
            //     required: true,
            //     message: 'Please input your E-mail!',
            //   },
            // ]}
          >
            <Input prefix={<MailOutlined className="site-form-item-icon" />}
              addonBefore={<MailOutlined />}
              placeholder="Email" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="reset-password-button">
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoginForm;
