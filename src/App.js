import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io.connect("http://localhost:5000");

function App() {
  const [username, setUsername] = useState("");
  const [showChat, setShowChat] = useState(false);
  
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [typingStatus, setTypingStatus] = useState("");
  
  const chatBodyRef = useRef(null);
  const typingTimeout = useRef(null);

  const joinChat = () => {
    if (username !== "") {
      setShowChat(true);
    }
  };

  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        text: currentMessage,
        author: username,
        time: new Date(Date.now()).getHours() + ":" + 
              String(new Date(Date.now()).getMinutes()).padStart(2, '0'),
      };

      setMessageList((list) => [...list, messageData]);
      await socket.emit("send_message", messageData);
      
      setCurrentMessage("");
      socket.emit("stop_typing"); // Instantly clear typing status
    }
  };

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value);
    socket.emit("typing", { author: username });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      socket.emit("stop_typing");
    }, 2000);
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    socket.on("display_typing", (data) => {
      setTypingStatus(`${data.author} is typing`);
    });

    socket.on("clear_typing", () => {
      setTypingStatus("");
    });

    return () => {
      socket.off("receive_message");
      socket.off("display_typing");
      socket.off("clear_typing");
    };
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messageList, typingStatus]);

  return (
    <div className="App">
      {!showChat ? (
        <div className="join-chat-container">
          <h3>Join the Conversation</h3>
          <input
            type="text"
            placeholder="Enter your name..."
            onChange={(event) => setUsername(event.target.value)}
            onKeyPress={(event) => event.key === "Enter" && joinChat()}
          />
          <button onClick={joinChat}>Join Chat</button>
        </div>
      ) : (
        <div className="chat-window">
          <div className="chat-header">
            <p>Live Chat</p>
          </div>
          
          <div className="chat-body" ref={chatBodyRef}>
            {messageList.map((messageContent, index) => {
              const isMe = messageContent.author === username;
              return (
                <div className="message-container" id={isMe ? "you" : "other"} key={index}>
                  <div className="message-content">
                    <p>{messageContent.text}</p>
                  </div>
                  <div className="message-meta">
                    <p id="author">{isMe ? "You" : messageContent.author}</p>
                    <p id="time">{messageContent.time}</p>
                  </div>
                </div>
              );
            })}
            
            {typingStatus && (
              <div className="typing-indicator-container">
                <p className="typing-text">{typingStatus}</p>
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-footer">
            <input
              type="text"
              value={currentMessage}
              placeholder="Type a message..."
              onChange={handleTyping}
              onKeyPress={(event) => event.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>&#9658;</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;