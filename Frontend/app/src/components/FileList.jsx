import React, { useState, useEffect } from 'react';
import { Table, message } from 'antd';
import axios from 'axios';

const FileList = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const result = await axios.get('http://yourapi.com/files');
      setFiles(result.data);
    } catch (error) {
      message.error('Failed to fetch files.');
    }
  };

  const columns = [
    {
      title: 'File Name',
      dataIndex: 'file_name',
      key: 'file_name'
    },
    {
      title: 'Upload Date',
      dataIndex: 'upload_date',
      key: 'upload_date',
      render: date => new Date(date).toLocaleDateString()  // Format date for readability
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={files}
      rowKey="id"
      pagination={{ pageSize: 10 }}  // Pagination settings
      bordered
      title={() => 'File List'}
      footer={() => 'End of File List'}
    />
  );
};

export default FileList;
