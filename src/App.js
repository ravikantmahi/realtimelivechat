import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// If testing locally, swap to localhost
const socket = io.connect("https://realtimelivechat-backend.onrender.com");

function App() {
  const [username, setUsername] = useState("");
  const [showChat, setShowChat] = useState(false);
  
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [typingStatus, setTypingStatus] = useState("");
  const [activeUsers, setActiveUsers] = useState([]); 
  
  const chatBodyRef = useRef(null);
  const typingTimeout = useRef(null);

  const emojis = ["😂", "❤️", "👍", "🔥", "✨", "👀"];

  const joinChat = () => {
    if (username !== "") {
      socket.emit("user_joined", username); 
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
        isSystem: false
      };

      setMessageList((list) => [...list, messageData]);
      await socket.emit("send_message", messageData);
      
      setCurrentMessage("");
      socket.emit("stop_typing"); 
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

  const addEmoji = (emoji) => {
    setCurrentMessage((prev) => prev + emoji);
  };

  const handleUserClick = (userToTag) => {
    if (userToTag !== username) {
      setCurrentMessage((prev) => prev + `@${userToTag} `);
    }
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    socket.on("system_message", (data) => {
      setMessageList((list) => [...list, { text: data.text, isSystem: true }]);
    });

    socket.on("display_typing", (data) => {
      setTypingStatus(`${data.author} is typing`);
    });

    socket.on("clear_typing", () => {
      setTypingStatus("");
    });

    socket.on("active_users", (users) => {
      setActiveUsers(users);
    });

    return () => {
      socket.off("receive_message");
      socket.off("system_message");
      socket.off("display_typing");
      socket.off("clear_typing");
      socket.off("active_users");
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
          <div className="hero-text">
            <h2>Welcome to RealTime Live Chat</h2>
            <p>Connect instantly and anonymously. Experience seamless, lightning-fast communication with our modern interface.</p>
          </div>
          <div className="join-box">
            <h3>Join the Conversation</h3>
            <input
              type="text"
              placeholder="Enter your alias..."
              onChange={(event) => setUsername(event.target.value)}
              onKeyPress={(event) => event.key === "Enter" && joinChat()}
            />
            <button onClick={joinChat}>Enter Chat Room</button>
          </div>
        </div>
      ) : (
        <div className="app-container">
          <div className="glass-panel main-interface">
            {/* Sidebar for About & Users */}
            <div className="sidebar">
              <div className="about-section">
                <h3>About This App</h3>
                <p>
                  🌐 <strong>realtimelivechat.vercel.app</strong> is a secure, fully anonymous real-time messaging platform. 
                  Messages disappear when you leave, ensuring your conversations remain private.
                </p>
                <ul className="feature-list">
                  <li>⚡ Instant Real-Time Delivery</li>
                  <li>🕵️‍♂️ 100% Anonymous</li>
                  <li>💬 Live Typing Indicators</li>
                </ul>
              </div>
              
              <div className="users-section">
                <h3 title="Click a name to tag them!">🟢 Online Now ({activeUsers.length})</h3>
                <ul className="user-list">
                  {activeUsers.map((user, index) => (
                    <li 
                      key={index} 
                      className={user === username ? "highlight-me" : "interactive-user"}
                      onClick={() => handleUserClick(user)}
                    >
                      {user} {user === username && "(You)"}
                    </li>
                  ))}
                </ul>
                <p className="sidebar-hint">*Click a user to tag them</p>
              </div>
            </div>

            {/* Chat Window */}
            <div className="chat-window">
              <div className="chat-header">
                <p>Global Chat Room</p>
              </div>
              
              <div className="chat-body" ref={chatBodyRef}>
                {messageList.map((messageContent, index) => {
                  if (messageContent.isSystem) {
                    return (
                      <div className="system-message" key={index}>
                        <span>{messageContent.text}</span>
                      </div>
                    );
                  }

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

              <div className="chat-footer-wrapper">
                <div className="emoji-bar">
                  {emojis.map((emoji, index) => (
                    <span key={index} className="emoji-btn" onClick={() => addEmoji(emoji)}>
                      {emoji}
                    </span>
                  ))}
                </div>
                <div className="chat-footer">
                  <input
                    type="text"
                    value={currentMessage}
                    placeholder="Type a message..."
                    onChange={handleTyping}
                    onKeyPress={(event) => event.key === "Enter" && sendMessage()}
                  />
                  <button onClick={sendMessage}>&#10148;</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Portfolio Footer */}
      <footer className="modern-footer">
        <div className="footer-content">
          <div className="footer-info">
            <p className="footer-credits">
              Designed & Developed by <strong>Ravi Kant</strong>
            </p>
            <p className="footer-skills">
              MCA Graduate | Web Developer | Graphic Designer
              <br/>
              Python | AI/ML | Big Data & Data Science
            </p>
            <p className="footer-email">
               <a href="mailto:contact@yourdomain.com">✉️ Contact Me</a>
            </p>
          </div>
          <div className="social-links">
            <a href="https://www.linkedin.com/in/ravikantmahi/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://github.com/Ravikantmahi" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://www.instagram.com/ravikant.mahii" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://reddit.com" target="_blank" rel="noopener noreferrer">Reddit</a>
            <a href="https://kaggle.com" target="_blank" rel="noopener noreferrer">Kaggle</a>
            <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer">Hugging Face</a>
            <a href="https://about.me" target="_blank" rel="noopener noreferrer">About.me</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
