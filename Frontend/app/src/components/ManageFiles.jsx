import React, { useState, useEffect } from "react";
import { Upload, Button, Table, message, Modal, Popconfirm } from "antd";
import { UploadOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import axios from "axios";
import axiosInstance from "../services/axiosConfig";
import dayjs from "dayjs";
import { useAuth } from "../AuthContext";
const UploadFile = () => {
 const [fileList, setFileList] = useState([]);
 const [files, setFiles] = useState([]);
 const { token, isAdmin, userId, orgId,login} = useAuth();
 useEffect(() => {
  fetchFiles();
 }, []);

 useEffect(() => {
  console.log(fileList);
 }, [fileList]);

 const fetchFiles = async () => {
  const res = await axiosInstance.get("/api/filelist");
  const { org_name, file_info } = res.data;
  login(token, isAdmin, userId, orgId, org_name);
  const formattedFiles = file_info.map((file) => ({
   ...file,
   updatetime: dayjs(file.updatetime).format("YYYY-MM-DD HH:mm:ss"),
  }));
  setFiles(formattedFiles);
 };

 const handleUpload = async ({ file, onSuccess, onError }) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axiosInstance.post(
   `/api/upload-${file.type === "application/pdf" ? "pdf" : "txt"}`,
   formData
  );
  message.success("File uploaded successfully");
  fetchFiles();
  onSuccess(res.data, file);
 };

 const handleDownloadFile = async (orgId, fileId) => {
  const response = await axiosInstance.get(
   `/api/download-file/${orgId}/${fileId}`,
   {
    responseType: "blob", // Important: Set responseType to blob
   }
  );
  const blob = new Blob([response.data], {
   type: response.headers["content-type"],
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);

  const contentDisposition = response.headers['content-disposition'];
  let filename = 'downloaded_file';
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename="(.+)"/);
    if (matches && matches.length === 2) {
      filename = matches[1];
    }
  }

  link.download = filename;

  link.click();
  URL.revokeObjectURL(link.href);
 };

 const handleDelete = async (orgId, fileId) => {
  try {
    await axiosInstance.delete(`/api/delete-file/${orgId}/${fileId}`);
    message.success('File deleted successfully');
    fetchFiles(); // Refresh the file list after deletion
  } catch (error) {
    message.error('Failed to delete file');
  }
};

 const showDeleteConfirm = (fileId) => {
  Modal.confirm({
   title: "Are you sure delete this file?",
   content: "This action cannot be undone.",
   okText: "Yes",
   okType: "danger",
   cancelText: "No",
   onOk() {
    handleDelete(fileId);
   },
  });
 };

 const handlePreview = async (fileId) => {
  window.open(`http://localhost:8080/file/${fileId}`, "_blank");
 };

 const columns = [
  { title: "File Name", dataIndex: "filename", key: "filename" },
  { title: "Upload Time", dataIndex: "updatetime", key: "updatetime" },
  {
   title: "Action",
   key: "action",
   render: (_, record) => (
    <span>
     <Button
      icon={<EyeOutlined />}
      onClick={() => handleDownloadFile(orgId, record.id)}
      style={{ marginRight: 8 }}
     >
      View
     </Button>
     <Popconfirm
          title="Clear the chat"
          description="Are you sure to clear this chat?"
          onConfirm={() => handleDelete(orgId,record.id)}
          okText="Yes"
          cancelText="No"
         >
     <Button
      icon={<DeleteOutlined />}
      // onClick={() => handleDelete(orgId,record.id)}
      danger
     >
      Delete
     </Button>
     </Popconfirm>
    </span>
   ),
  },
 ];

 return (
  <div>
   <div
    style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}
   >
    <Upload
     customRequest={handleUpload}
     fileList={fileList}
     onChange={({ fileList }) => setFileList(fileList)}
     showUploadList={false}
    >
     <Button icon={<UploadOutlined />}>Click to Upload</Button>
    </Upload>
   </div>
   <Table columns={columns} dataSource={files} rowKey="id" />
  </div>
 );
};

export default UploadFile;
