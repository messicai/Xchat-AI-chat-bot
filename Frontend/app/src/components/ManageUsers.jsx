import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import axiosInstance from '../services/axiosConfig';
import { useAuth } from '../AuthContext';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);
  const { token, isAdmin,userId,orgId} = useAuth();
  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/api/admin/normal-users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('Failed to connect to the server. Please check your network and server status.');
    }
  };

  const deleteUser = async (id) => {
      await axiosInstance.delete(`/api/admin/delete-normal-user/${id}`);
      message.success('User deleted successfully');
      fetchUsers();
  };

  const handleOk = async () => {

      let values = await form.validateFields();
      values = {
        ...values,
        admin_id: userId,
        org_id: orgId,
      };
      if (editingUser) {
        await axiosInstance.put(`/api/admin/edit-normal-user/${editingUser.id}`, values);
        message.success('User updated successfully');
      } else {
        await axiosInstance.post('/register-normal-user', values);
        message.success('User created successfully');
      }
      fetchUsers();
      setIsModalVisible(false);
      setEditingUser(null);
      form.resetFields();
    
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const showEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalVisible(true);
  };

  const [form] = Form.useForm();

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <>
          <Button type="primary" onClick={() => showEditModal(record)} style={{ marginRight: 8 }}>Edit</Button>
          <Popconfirm title="Sure to delete?" onConfirm={() => deleteUser(record.id)}>
            <Button icon={<DeleteOutlined />} type="danger">Delete</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginTop: 16, marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" onClick={() => setIsModalVisible(true)}>Add New User</Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" />
      <Modal
        title={editingUser ? "Edit User" : "Add User"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: false, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: false }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required:  true }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ManageUsers;
