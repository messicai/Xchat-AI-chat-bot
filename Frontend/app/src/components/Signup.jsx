import React, { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import {
 MailOutlined,
 LockOutlined,
 UserOutlined,
 SmileOutlined,
 TeamOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../scss/LoginSingupFrom.scss"; // Assuming you will create a CSS file for custom styles

const { Title, Text } = Typography;

const RegistrationForm = () => {
 const navigate = useNavigate();

 const onFinish = async (values) => {
  console.log("Received values of form: ", values);
  try {
   const response = await axios.post("http://localhost:8080/register", values);
   message.success("Registration successful");
   navigate("/login");
  } catch (error) {
   console.error("Failed to register:", error);
   message.error("Registration failed. Please try again.");
  }
 };

 return (
  <div className="registration-container">
   <div className="registration-box">
    <div className="registration-header">
     <SmileOutlined
      style={{ fontSize: "32px", marginRight: "10px", color: "#40a9ff" }}
     />
     <Title level={2} style={{ color: "#ffffff", display: "inline-block" }}>
      Create Your Account
     </Title>
    </div>
    <Text
     style={{
      display: "block",
      textAlign: "center",
      marginBottom: "20px",
      color: "#ffffff",
     }}
    >
     Join X-chat, your ultimate AI assistant platform
    </Text>
    <Form name="register" onFinish={onFinish} scrollToFirstError>
     {/* <Form.Item
                        name="email"
                        rules={[
                            {
                                type: 'email',
                                message: 'The input is not valid E-mail!',
                            },
                            {
                                required: true,
                                message: 'Please input your E-mail!',
                            },
                        ]}
                    >
                        <Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="Email" addonBefore={<MailOutlined />} />
                    </Form.Item> */}

     <Form.Item
      name="username"
      rules={[{ required: true, message: "Please input your Username!" }]}
     >
      <Input
       prefix={<UserOutlined className="site-form-item-icon" />}
       placeholder="Username"
       addonBefore={<UserOutlined />}
      />
     </Form.Item>

     <Form.Item
      name="password"
      rules={[{ required: true, message: "Please input your Password!" }]}
     >
      <Input
       prefix={<LockOutlined className="site-form-item-icon" />}
       type="password"
       placeholder="Password"
       addonBefore={<LockOutlined />}
      />
     </Form.Item>
     <Form.Item
      name="org_name"
      rules={[
       { required: true, message: "Please input your Organization name!" },
      ]}
     >
      <Input
       prefix={<TeamOutlined className="site-form-item-icon" />}
       placeholder="Organization name"
       addonBefore={<TeamOutlined />}
      />
     </Form.Item>
     <Form.Item>
      <Button type="primary" htmlType="submit" className="register-form-button">
       Register
      </Button>
     </Form.Item>

     <Form.Item>
      <Link
       to="/login"
       style={{ display: "block", textAlign: "center", color: "#40a9ff" }}
      >
       Already have an account? Back to login
      </Link>
     </Form.Item>
    </Form>
   </div>
  </div>
 );
};

export default RegistrationForm;
