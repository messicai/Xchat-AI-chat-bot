from openai import OpenAI
from typing import List,Dict,Union
from fastapi import FastAPI,HTTPException,Request
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
history = []
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"],
    allow_headers=["*"],
    max_age=86400
)

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = "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"
)
class Prompt(BaseModel):
    role: str
    content: str
class TalkRequest(BaseModel):
    model:str
    message: List[Prompt] 
    session_id: str
class SessionData(BaseModel):
    session_model: str
    prompts: List[Prompt]

chat_sessions: Dict[str, SessionData] = {}

@app.post("/api/generate")
async def chatbot_talk(user_input: TalkRequest):
    session_data = chat_sessions.get(user_input.session_id, SessionData(session_model=user_input.model, prompts=[]))
    # Add messages to the history if there are any
    if not session_data.prompts:
        session_data.prompts.extend(user_input.message)
    else:
        session_data.prompts.append(user_input.message[-1])
    
    response = client.chat.completions.create(
        model=user_input.model,
        messages=session_data.prompts,
        temperature=0.5,
        top_p=1,
        max_tokens=1024,
        stream=False
    )
    # print(response)
    bot_response = response.choices[0].message.content 

    # Append the bot response
    session_data.prompts.append({"role": "assistant", "content": bot_response})
    # Update the session data
    chat_sessions[user_input.session_id] = session_data
    print(chat_sessions)
    return {"content": bot_response}

# Model list options
class ModelKeyPair(BaseModel):
    model: str
model_key_pairs: List[ModelKeyPair] = [
    {"model": "google/gemma-7b"},
    {"model": "meta/llama3-70b-instruct"},
    {"model": "microsoft/phi-3-mini-128k-instruct"},
]

# model list
@app.get("/api/models-keys", response_model=List[ModelKeyPair])
async def get_model_key_pairs():
    global history
    history = []
    return model_key_pairs

# clear chat history
@app.post("/api/clear-history/{session_id}")
async def clear_chat_history(session_id: str):
    # 检查会话ID是否存在
    if session_id in chat_sessions:
        # 重置会话的prompts为空列表
        chat_sessions[session_id].prompts = []
        return {"message": f"Chat history for session {session_id} cleared successfully."}
    else:
        # 如果会话ID不存在，返回错误
        raise HTTPException(status_code=404, detail="Session not found.")
    
# Query session by Id
@app.get("/api/history/{session_id}", response_model=SessionData)
async def get_chat_history(session_id: str):
    if session_id in chat_sessions:
        return chat_sessions[session_id]
    else:
        raise HTTPException(status_code=404, detail="Chat history not found.")

@app.post("/api/create-session")
async def create_session(request: Request):
    body = await request.json()
    model = body.get("model")
    if not model:
        raise HTTPException(status_code=400, detail="Model is required")
    # Generate a unique session_id, for example by using UUID
    import uuid
    session_id = str(uuid.uuid4())
    default_session_prompts = [
        {"role": "system", "content": "Hello there, this is X bot!"}
    ]
    chat_sessions[session_id] = SessionData(session_model=model, prompts=default_session_prompts)
    return {"session_id": session_id}

@app.delete("/api/delete-session/{session_id}")
async def delete_session(session_id: str):
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return JSONResponse(content={"message": "Session deleted successfully."}, status_code=200)
    else:
        return JSONResponse(content={"detail": "Session not found."}, status_code=404)

@app.get("/api/sessions", response_model=Dict[str, SessionData])
async def get_all_sessions():
    # If chat_sessions is empty, add a default session data
    if not chat_sessions:
        default_session_data = SessionData(
            session_model="google/gemma-7b",
            prompts=[
                {"role": "system", "content": "Hello there, this is X bot!"}
            ]
        )
        chat_sessions['default_session_id'] = default_session_data
    return chat_sessions