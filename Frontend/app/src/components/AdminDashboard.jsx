import React, { useState } from "react";
import { Layout, Menu, Tag } from "antd";
import {
 FileOutlined,
 UserOutlined,
 HomeOutlined,
 LogoutOutlined,
 BarChartOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import ManageFiles from "./ManageFiles";
import ManageUsers from "./ManageUsers";
import Statistics from "./Statistics";
import styles from "@/scss/Dashboard.module.scss";
import { useAuth } from "../AuthContext";
const { Header, Content, Footer, Sider } = Layout;

function AdminDashboard() {
 const [menuKey, setMenuKey] = useState("files");
 const { orgName } = useAuth()

 const renderContent = () => {
  switch (menuKey) {
   case "users":
    return <ManageUsers />;
   case "statistics":
    return <Statistics />;
   case "files":
   default:
    return <ManageFiles />;
  }
 };

 return (
  <Layout style={{ minHeight: "100vh" }}>
    {console.log(orgName)}
   <Sider collapsible width={280}>
    <div className={styles["side-header"]}>
     <div className={styles.sidebarLogo}>
      <img src="/Xlogo_light.png" alt="" />
     </div>
     <div className={styles["desc"]}>
      X-chat
     </div>
    </div>
    <Menu
     theme="dark"
     defaultSelectedKeys={["files"]}
     mode="inline"
     style={{ fontSize: "16px" }}
    >
     <Menu.Item
      key="files"
      icon={<FileOutlined />}
      onClick={() => setMenuKey("files")}
      style={{ fontSize: "16px" }}
     >
      Manage Files
     </Menu.Item>
     <Menu.Item
      key="users"
      icon={<UserOutlined />}
      onClick={() => setMenuKey("users")}
      style={{ fontSize: "16px" }}
     >
      Manage Users
     </Menu.Item>
     <Menu.Item
      key="statistics"
      icon={<BarChartOutlined />}
      onClick={() => setMenuKey("statistics")}
      style={{ fontSize: "16px" }}
     >
      Statistics
     </Menu.Item>
     <Menu.Item key="home" icon={<HomeOutlined />} style={{ fontSize: "16px" }}>
      <Link to="/homepage" style={{ fontSize: "16px" }}>
       X-ChatBot
      </Link>
     </Menu.Item>
     <Menu.Item
      key="logout"
      icon={<LogoutOutlined />}
      style={{ fontSize: "16px" }}
     >
      <Link to="/login" style={{ fontSize: "16px" }}>
       Logout
      </Link>
     </Menu.Item>
    </Menu>
   </Sider>
   <Layout className="site-layout" style={{ height: "100vh" }}>
    <Header
     style={{
      padding: 0,
      background: "#0a1f44",
      color: "#fff",
      textAlign: "center",
      height: "48px",
      lineHeight: "48px",
      display:"flex"
     }}
    >
    <h2 style={{paddingLeft:10}}>Organization: <Tag style={{padding:"5px 10px",fontSize:20}} color="geekblue">{orgName}</Tag></h2>
     <h1 style={{ color: "#fff", margin: 0, flex:1 }}>Admin Dashboard</h1>
    </Header>
    <Content style={{ margin: "16px" }}>
     <div style={{ padding: 24, minHeight: "100%", background: "#fff" }}>
      {renderContent()}
     </div>
    </Content>
    <Footer style={{ textAlign: "center",padding:"18px" }}>X-Chat 2024</Footer>
   </Layout>
  </Layout>
 );
}

export default AdminDashboard;
