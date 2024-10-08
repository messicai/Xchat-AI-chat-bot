import React, { useState } from 'react';
import { Form, Input, Button, Modal, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import axios from 'axios';

const ResetPasswordForm = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const onFinish = async (values) => {
        console.log('Received values of form: ', values);
        try {
            const response = await axios.post('http://localhost:8080/request-reset-password', values);
            message.success(response.data.message);
            setIsModalVisible(false);
        } catch (error) {
            console.error('Failed to reset password:', error);
            message.error('Failed to reset password. Please try again.');
        }
    };

    return (
        <>
            <Button type="link" onClick={showModal}>
                Forgot password
            </Button>
            <Modal title="Reset Password" visible={isModalVisible} onCancel={handleCancel} footer={null}>
                <Form
                    name="reset_password"
                    onFinish={onFinish}
                    style={{ maxWidth: '300px', margin: 'auto' }}
                >
                    <Form.Item
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
                        <Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="Email" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="reset-password-button" style={{ width: '100%' }}>
                            Reset Password
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ResetPasswordForm;
