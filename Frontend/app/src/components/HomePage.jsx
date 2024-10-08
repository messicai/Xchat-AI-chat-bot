import React, { useEffect, useState, useRef } from "react";
import "../App.scss";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { Link } from "react-router-dom"; // Import Link from react-router-dom
import {
 Select,
 Col,
 Row,
 message,
 Button,
 Tooltip,
 Popconfirm,
 Upload,
} from "antd";
import { ClearOutlined, UploadOutlined } from "@ant-design/icons";
import {
 MainContainer,
 ChatContainer,
 MessageList,
 Message,
 MessageInput,
 TypingIndicator,
 Avatar,
 ConversationHeader,
 Sidebar,
} from "@chatscope/chat-ui-kit-react";
import API_BASE_URL from "../config";
import { flushSync } from "react-dom";
import { useAuth } from "../AuthContext";
import axiosInstance from "../services/axiosConfig";
function App() {
 const [messages, setMessages] = useState([
  {
   props: {
    model: {
     message: "Hello my friend",
     sender: "system",
     direction: "incoming",
    },
    children: <Avatar src="/chatbot.jpg" name="bot" />,
   },
  },
 ]);
 const [isTyping, setIsTyping] = useState(false);
 const [modelOptions, setModelOptions] = useState([]);
 const [appliedOption, setAppliedOption] = useState();
 const [messageApi, contextHolder] = message.useMessage();
 const [sessionId, setSessionId] = useState(null);
 const [sessionIdList, setSessionIdList] = useState([]);
 const [sessionList, setSessionList] = useState({});
 const [fileInfoList, setFileInfoList] = useState([]);
 const [selectedFile, setSelectedFile] = useState([]);
 const [fileOptionsLoaded, setFileOptionsLoaded] = useState(false);
 const newMessageToSend = useRef(null);
 const uploadingFlag = useRef(false);
 const { token, isAdmin, userId } = useAuth();
 // Query the llm's data when first loading
 useEffect(() => {
  fetchModels();
  fetchSessions();
  // console.log(token,isAdmin,'userInfo');
 }, []);

 // Observe sessionIdList changes
 useEffect(() => {
  console.log("Updated Session IDs:", sessionIdList);
 }, [sessionIdList]);

 // Observe sessionId changes
 useEffect(() => {
  fetchSessions();
  fetchFileOptions();
 }, [sessionId]);

 useEffect(() => {
  if (fileOptionsLoaded) {
    fetchSessions();  // rely fileOptionsLoaded Make sure the data is loaded before executing
  }
}, [fileOptionsLoaded]);


 useEffect(() => {
  console.log(selectedFile, "111");
 }, [selectedFile]);

 // Listen for changes in messages and call handleSend when newMessageToSend.current has a value
 useEffect(() => {
  if (newMessageToSend.current) {
   handleSend(newMessageToSend.current);
   newMessageToSend.current = null;
  }
 }, [messages]);

 //  useEffect(() => {
 //   if (fileInfo.file && fileInfo.file.response) {
 //    const updatedContent = fileInfo.file.response.content;

 //    const updatedMessages = messages.map((message) => {
 //     if (message.props.model.sender === "system") {
 //      return {
 //       ...message,
 //       props: {
 //        ...message.props,
 //        model: {
 //         ...message.props.model,
 //         message: updatedContent,
 //        },
 //       },
 //      };
 //     }
 //     return message;
 //    });
 //    console.log("Updated messages:", updatedMessages); // check updatedMessages 

 //    setMessages(updatedMessages);

 //    // 
 //    newMessageToSend.current = `File uploaded: ${fileInfo.file.name}`;

 //    console.log(fileInfo.fileList, "fileList");
 //    console.log(updatedMessages);
 //   }
 //  }, [fileInfo]);

 // Function to fetch models
 const fetchModels = async () => {
  const response = await axiosInstance.get("/api/models-keys");
  const data = response.data;
  const options = data.map((ele) => ({
   value: ele.model,
   label: ele.model,
  }));
  setModelOptions(options);
  if (options.length > 0) {
  }
 };

 // Function to fetch history for a specific session
 const fetchSessionHistory = async (sessionId) => {
  try {
   const response = await axiosInstance.get(`/api/history/${sessionId}`);
   const history = response.data;
   return history; // Return the fetched history
  } catch (error) {
   return []; // Return an empty array in case of error
  }
 };

 const fetchFileOptions = async () => {
  const response = await axiosInstance.get("/api/filelist");
  const { org_name, file_info } = response.data;
  const options = file_info.map((ele) => ({
    value: ele.content,
    label: ele.filename,
  }));
  setFileInfoList(options);
  console.log(options, "file_data");
  setFileOptionsLoaded(true);  // File options loaded
};


 // Function to fetch sessions
 const fetchSessions = async () => {
  const response = await axiosInstance.get("/api/sessions");
  const sessions = response.data;
  const keys = Object.keys(sessions);
  setSessionIdList(keys);
  setSessionList(sessions);
  if (sessionId == null) {
   handleSessionItemClick("default_session_id");
  }
  for (let id in sessions) {
   if (id === sessionId) {
    setAppliedOption(sessions[id].session_model);
   }
  }
 };
 const handleModelChange = (value) => {
  console.log(value);
  setAppliedOption(value);
  messageApi.success("The language model has been switched");
 };

 const handleClear = async () => {
  if (!messages.length) {
   messageApi.info("You've already cleared the chat");
   return;
  }
  const response = await axiosInstance.post("/api/clear-history/" + sessionId);
  const data = response.data;
  setMessages([]);
  messageApi.success(data.message);
 };

 // Modify the handleNewChatClick function and add the logic to create a new session
 const handleNewChatClick = async () => {
  const response = await axiosInstance.post("/api/create-session", {
   model: appliedOption,
  });
  const data = response.data;
  const newSessionId = data.session_id;
  setMessages([]);
  handleSessionItemClick(newSessionId);
  messageApi.success("New chat session created successfully.");
 };

 // Function to handle session item click
 const handleSessionItemClick = async (sessionId) => {
  // if (fileInfoList.length === 0) {
  //   console.log("fileInfoList is empty, skipping handleSessionItemClick");
  //   return;
  // }
  try {
   const history = await fetchSessionHistory(sessionId);
   //Show the uploaded file on uploaded component
   //  setFileInfo({ file: {}, fileList: [...history.promptFilelist] });
   // Convert history to messages format and update the messages state
   if (
    history.promptFilelist &&
    Object.keys(history.promptFilelist).length > 0
  ) {
    const firstValue = history.promptFilelist["value"];
    const fileExists = fileInfoList.some(file => file.value === firstValue);

    if (fileExists) {
      setSelectedFile([firstValue]);
    } else {
      setSelectedFile([]);
    }
  } else {
    setSelectedFile([]);
  }
   console.log(selectedFile, "okok");
   const newMessages = history.prompts.map((item) => ({
    props: {
     model: {
      message: item.content,
      sender:
       item.role === "user"
        ? "user"
        : item.role === "assistant"
        ? "assistant"
        : "system",
      direction: item.role === "user" ? "outgoing" : "incoming",
     },
     children: (
      <Avatar
       src={
        item.role === "user"
         ? "https://chatscope.io/storybook/react/assets/joe-v8Vy3KOS.svg"
         : "/chatbot.jpg"
       }
       name={item.role === "user" ? "user" : "bot"}
      />
     ),
    },
   }));
   setMessages(newMessages);
   setSessionId(sessionId); // Update the selected session ID
  } catch (error) {
   console.error("Error occurred while handling session item click:", error);
  }
 };

 const handleSend = async (message) => {
  console.log(selectedFile, "selected");
  const newMessage = {
   props: {
    className: "message-user-enter",
    model: {
     message,
     direction: "outgoing",
     sender: "user",
    },
    children: (
     <Avatar
      src="https://chatscope.io/storybook/react/assets/joe-v8Vy3KOS.svg"
      name="user"
     />
    ),
   },
  };

  const newMessages = [...messages, newMessage];
  setMessages(newMessages);

  // Initial system message to determine ChatGPT functionality
  // How it responds, how it talks, etc.
  setIsTyping(true);
  await processMessageToChatGPT(newMessages);
  fetchSessions();
 };

 async function processMessageToChatGPT(chatMessages) {
  // if (!Array.isArray(fileInfo.fileList)) {
  //  console.error("fileList is either not set or not an array");
  //  return;
  // }

  let apiMessages = chatMessages.map((messageObject) => {
   let role = "";
   const obj = messageObject.props.model;
   if (obj.sender === "assistant") {
    role = "assistant";
   } else if (obj.sender === "system") {
    role = "system";
   } else {
    role = "user";
   }
   return { role: role, content: obj.message };
  });
  let fileObj = {};
  if (selectedFile.length) {
   fileObj = fileInfoList.find((ele) => ele.value === selectedFile[0]) || {};
  }
  console.log(fileObj, "objjj");
  const apiRequestBody = {
   model: appliedOption,
   promptFilelist: fileObj,
   message: [...apiMessages],
   session_id: sessionId,
  };
  console.log(apiRequestBody);
  await axiosInstance.post("/api/generate", apiRequestBody).then((response) => {
   const data = response.data;
   const resMessage = {
    props: {
     className: "message-bot-enter",
     model: {
      message: data.content,
      sender: "assistant",
     },
     children: <Avatar src="/chatbot.jpg" name="bot" />,
    },
   };
   setMessages([...chatMessages, resMessage]);
   setIsTyping(false);
  });
 }

 //File upload
 const beforeUpload = (file) => {
  const isPdf = file.type === "application/pdf";
  const isTxt = file.type === "text/plain";
  if (!isPdf && !isTxt) {
   message.error("You can only upload TXT or PDF files!");
  }
  return isPdf || isTxt || Upload.LIST_IGNORE;
 };

 const handleFileChange = (info) => {
  // This section contains a special operation due to a bug in the Upload component's fileList,
  // which causes the status to remain "loading". Hence, this modification was made.
  if (info.file.status === "uploading") {
   info.file.status = "done";
   setFileInfo(info);
  }
  if (info.file.status === "done" && info.file.response) {
   console.log(info);
   message.success(`${info.file.name} file uploaded successfully`);
   setFileInfo(info);
  } else if (info.file.status === "error") {
   message.error(`${info.file.name} file upload failed.`);
  }
 };

 const fileOnSelect = (info) => {
  const updatedContent = info;

  const updatedMessages = messages.map((message) => {
   if (message.props.model.sender === "system") {
    return {
     ...message,
     props: {
      ...message.props,
      model: {
       ...message.props.model,
       message: `The uploaded file content:${updatedContent}`,
      },
     },
    };
   }
   return message;
  });
  console.log("Updated messages:", updatedMessages); // Check if updatedMessages is correct
  setSelectedFile([updatedContent]);
  setMessages(updatedMessages);
  const file = fileInfoList.find((ele) => ele.value === updatedContent);
  const file_name = file ? file.label : "unknown file";
  // Save the new message to be sent to newMessageToSend
  newMessageToSend.current = `File uploaded: ${file_name}`;

  // console.log(fileInfo.fileList, "fileList");
  console.log(updatedMessages);
 };

 return (
  <div className="App">
   <div style={{ position: "relative", height: "800px", width: "70vw" }}>
    <nav className="navbar">
     <div className="navbar-content">
      {isAdmin ? (
       <Link to="/admin-dashboard" className="nav-button">
        Go to Dashboard
       </Link>
      ) : (
       ""
      )}
      {isAdmin ? <span className="separator">|</span> : ""}
      <Link to="/login" className="nav-button">
       Log Out
      </Link>
     </div>
    </nav>
    <MainContainer responsive style={{ borderRadius: "8px" }}>
     <Sidebar position="left" style={{ minWidth: "400px" }} scrollable={false}>
      <div className="sidebar">
       <div className="sidebar-header">
        <h1>X-chat</h1>
        <p>Build your own AI assistant.</p>
        <div className="logo">
         <img src="/Xlogo.png" alt="" />
        </div>
        <Row justify={"start"} align={"middle"}>
         <Col className="model-text">Choose your language model:</Col>
         <Col offset={2}>
          {contextHolder}
          <Select
           value={appliedOption}
           style={{
            width: 120,
           }}
           onChange={handleModelChange}
           options={modelOptions}
          />
         </Col>
        </Row>
       </div>

       <div className="sidebar-content">
        <div className="chat-list">
         {sessionIdList.map((ele, i) => {
          const isSelected = ele === sessionId;
          return (
           <div
            className={`chat-item ${isSelected ? "chat-item-selected" : ""}`}
            key={i}
            id={ele}
            onClick={() => handleSessionItemClick(ele)}
           >
            <div className="chat-item-content">
             <span className="chat-name">chat {i}</span>
             <span className="chat-amount">
              {sessionList[ele].prompts.length} messages
             </span>
            </div>
           </div>
          );
         })}
        </div>
       </div>
       <div className="sidebar-footer">
        <button className="sidebar-button" onClick={handleNewChatClick}>
         New Chat
        </button>
       </div>
      </div>
     </Sidebar>
     <ChatContainer>
      <ConversationHeader>
       <Avatar name="Xbot" src="/chatbot.jpg" />
       <ConversationHeader.Content
        info="Your intelegent assistant"
        userName="Xbot"
       />
       <ConversationHeader.Actions>
        {/* <Upload
         name="file"
         beforeUpload={beforeUpload}
         onChange={handleFileChange}
         fileList={fileInfo.fileList}
         maxCount={1}
         showUploadList={true}
         customRequest={async ({ file, onSuccess, onError }) => {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await axiosInstance.post(
              `/api/upload-${file.type === "application/pdf" ? "pdf" : "txt"}`,
              formData
            );
            onSuccess(response.data, file);
            console.log(response.data, "result");
          } catch (error) {
            onError(error);
          }
        }}
        >
         <Button
          icon={<UploadOutlined />}
          style={{
           marginRight: "10px",
           color: "white",
           backgroundColor: "#30BCC9",
          }}
         >
          Upload File
         </Button>
        </Upload> */}
        <Select
         showSearch
         style={{ width: 200, marginRight: 20 }}
         placeholder="Search and select a file"
         optionFilterProp="children"
         options={fileInfoList}
         onChange={fileOnSelect}
         value={selectedFile}
        />
        <Tooltip title="Clear chat" color="#f50" key="#f50">
         <Popconfirm
          title="Clear the chat"
          description="Are you sure to clear this chat?"
          onConfirm={handleClear}
          okText="Yes"
          cancelText="No"
         >
          <Button type="primary" icon={<ClearOutlined />} size="large" danger />
         </Popconfirm>
        </Tooltip>
       </ConversationHeader.Actions>
      </ConversationHeader>
      <MessageList
       autoScrollToBottom
       scrollBehavior="smooth"
       typingIndicator={
        isTyping ? <TypingIndicator content="X-Chat is typing" /> : null
       }
      >
       {messages.map((message, i) => {
        const newMessage = {
         ...message,
         props: {
          ...message.props,
          model: {
           ...message.props.model,
           message:
            message.props.model.sender === "system"
             ? "Hello there, this is X bot!"
             : message.props.model.message,
          },
         },
        };
        return <Message key={i} {...newMessage.props} />;
       })}
      </MessageList>

      <MessageInput
       placeholder="Type message here"
       onSend={handleSend}
       attachButton={false}
      />
     </ChatContainer>
    </MainContainer>
   </div>
  </div>
 );
}

export default App;
