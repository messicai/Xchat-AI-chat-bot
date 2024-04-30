import { useEffect, useState } from "react";
import "./App.scss";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { Select, Col, Row, message, Button, Tooltip, Popconfirm } from "antd";
import { ClearOutlined } from "@ant-design/icons";
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
import API_BASE_URL from "@/config";

function App() {
 const [messages, setMessages] = useState([
  {
   props: {
    model: {
     message: "Hello my friend",
     sender: "System",
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
 const [sessionList, setSessionList] = useState({})
 // Query the llm's data when first loading
 useEffect(() => {
  fetchModels();
  fetchSessions();
 }, []);

 // Observe sessionIdList changes
 useEffect(() => {
  console.log("Updated Session IDs:", sessionIdList);
 }, [sessionIdList]);

 // // Observe sessionId changes
 useEffect(() => {
  fetchSessions();
 }, [sessionId]);

 // Function to fetch models
 const fetchModels = async () => {
  try {
   const response = await fetch(`${API_BASE_URL}/models-keys`);
   if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
   }
   const data = await response.json();
   const options = data.map((ele) => ({
    value: ele.model,
    label: ele.model,
   }));
   setModelOptions(options);
   if (options.length > 0) {
    setAppliedOption(options[0].value);
   }
  } catch (error) {
   console.error("There was a problem fetching the model options data:", error);
  }
 };

 // Function to fetch history for a specific session
 const fetchSessionHistory = async (sessionId) => {
  try {
   const response = await fetch(`${API_BASE_URL}/history/${sessionId}`);
   if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
   }
   const history = await response.json();
   return history; // Return the fetched history
  } catch (error) {
   console.error(
    `There was a problem fetching history for session ${sessionId}:`,
    error
   );
   return []; // Return an empty array in case of error
  }
 };

 // Function to fetch sessions
 const fetchSessions = async () => {
  try {
   const response = await fetch(`${API_BASE_URL}/sessions`);
   if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
   }
   const sessions = await response.json();
   // Perform actions with the session data
   const keys = Object.keys(sessions);
   setSessionIdList(keys); // Set the list of session IDs
   console.log(sessions);
   // Check if default session exists
   // if (sessions.hasOwnProperty('default_session_id')){
   //   handleSessionItemClick('default_session_id')
   // }
   setSessionList(sessions)
   if (sessionId == null) {
    handleSessionItemClick("default_session_id");
   }
   // swtich the model according to the sessionId
   for (let id in sessions) {
    if (id === sessionId) {
     setAppliedOption(sessions[id].session_model);
    }
   }
  } catch (error) {
   console.error("There was a problem fetching the sessions data:", error);
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
  try {
   const response = await fetch(`${API_BASE_URL}/clear-history/${sessionId}`, {
    method: "POST",
   });
   if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
   }
   setMessages([]);
   const data = await response.json();
   messageApi.success(data.message);
  } catch (error) {
   console.error("Error occurred while clearing chat history:", error);
   messageApi.error("Failed to clear chat history.");
  }
 };

 // 修改 handleNewChatClick 函数，添加创建新会话的逻辑
 const handleNewChatClick = async () => {
  try {
   const response = await fetch(`${API_BASE_URL}/create-session`, {
    method: "POST",
    headers: {
     "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: appliedOption }), // 确保传递了模型选项
   });
   if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
   }
   const data = await response.json();
   const newSessionId = data.session_id;
   // 清空聊天消息列表
   setMessages([]);
   handleSessionItemClick(newSessionId);
   messageApi.success("New chat session created successfully.");
  } catch (error) {
   console.error("Error occurred while creating new chat session:", error);
   messageApi.error("Failed to create new chat session.");
  }
 };

 // Function to handle session item click
 const handleSessionItemClick = async (sessionId) => {
  try {
   const history = await fetchSessionHistory(sessionId);
   // Convert history to messages format and update the messages state
   const newMessages = history.prompts.map((item) => ({
    props: {
     model: {
      message: item.content,
      sender: item.role === "user" ? "user" : "ChatGPT",
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
  fetchSessions()
 };

 async function processMessageToChatGPT(chatMessages) {
  // messages is an array of messages
  // Format messages for chatGPT API
  // API is expecting objects in format of { role: "user" or "assistant", "content": "message here"}
  // So we need to reformat

  let apiMessages = chatMessages.map((messageObject) => {
   let role = "";
   const obj = messageObject.props.model;
   if (obj.sender === "ChatGPT") {
    role = "assistant";
   } else if (obj.sender === "System") {
    role = "system";
   } else {
    role = "user";
   }
   return { role: role, content: obj.message };
  });

  // Get the request body set up with the model we plan to use
  // and the messages which we formatted above. We add a system message in the front to'
  // determine how we want chatGPT to act.
  const apiRequestBody = {
   model: appliedOption,
   message: [
    // systemMessage,  // The system message DEFINES the logic of our chatGPT
    ...apiMessages, // The messages from our chat with ChatGPT
   ],
   session_id: sessionId,
  };
  await fetch(`${API_BASE_URL}/generate`, {
   method: "POST",
   headers: {
    "Content-Type": "application/json",
   },
   body: JSON.stringify(apiRequestBody),
  })
   .then((data) => {
    return data.json();
   })
   .then((data) => {
    console.log(data);
    const resMessage = {
     props: {
      className: "message-bot-enter",
      model: {
       message: data.content,
       sender: "ChatGPT",
      },
      children: <Avatar src="/chatbot.jpg" name="bot" />,
     },
    };
    setMessages([...chatMessages, resMessage]);
    setIsTyping(false);
   });
 }

 return (
  <div className="App">
   <div style={{ position: "relative", height: "800px", width: "70vw" }}>
    <MainContainer responsive style={{ borderRadius: "8px" }}>
     <Sidebar position="left" style={{ minWidth: "400px" }}>
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
             <span className="chat-amount">{sessionList[ele].prompts.length} messages</span>
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
        console.log(message);
        return <Message key={i} {...message.props} />;
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
