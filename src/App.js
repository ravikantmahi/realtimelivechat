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

  // Helper to get initials
  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="App">
      {!showChat ? (
        <div className="join-chat-container">
          <div className="hero-text">
            <h2>Enter the Void</h2>
            <p>Connect instantly and anonymously. Experience seamless, lightning-fast communication in our secure real-time environment.</p>
          </div>
          <div className="join-box">
            <h3>Join Conversation</h3>
            <input
              type="text"
              placeholder="Enter your alias..."
              onChange={(event) => setUsername(event.target.value)}
              onKeyPress={(event) => event.key === "Enter" && joinChat()}
            />
            <button onClick={joinChat}>Enter Room <span>&#10148;</span></button>
          </div>
        </div>
      ) : (
        <div className="app-container">
          <div className="glass-panel main-interface">
            
            {/* Sidebar for About & Users */}
            <div className="sidebar">
              <div className="about-section">
                <h3>Nexus Chat</h3>
                <p>
                  Secure, fully anonymous real-time messaging. 
                  Messages disappear when you leave, ensuring absolute privacy.
                </p>
                <ul className="feature-list">
                  <li><span className="icon">⚡</span> Instant Delivery</li>
                  <li><span className="icon">🕵️‍♂️</span> 100% Anonymous</li>
                  <li><span className="icon">💬</span> Live Typing</li>
                </ul>
              </div>
              
              <div className="users-section">
                <h3 title="Click a name to tag them!">
                  Network ({activeUsers.length})
                </h3>
                <ul className="user-list">
                  {activeUsers.map((user, index) => (
                    <li 
                      key={index} 
                      className={user === username ? "highlight-me" : "interactive-user"}
                      onClick={() => handleUserClick(user)}
                    >
                      <div className="user-info">
                        <div className="avatar">{getInitial(user)}</div>
                        <span className="username-text">{user} {user === username && "(You)"}</span>
                      </div>
                      <div className="status-dot"></div>
                    </li>
                  ))}
                </ul>
                <p className="sidebar-hint">*Click a user to tag</p>
              </div>
            </div>

            {/* Chat Window */}
            <div className="chat-window">
              <div className="chat-header">
                <div className="header-status"></div>
                <p>Global Frequency</p>
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
                      {!isMe && <div className="message-avatar">{getInitial(messageContent.author)}</div>}
                      <div className="message-bubble-wrapper">
                        <div className="message-meta-top">
                          {!isMe && <span id="author">{messageContent.author}</span>}
                        </div>
                        <div className="message-content">
                          <p>{messageContent.text}</p>
                        </div>
                        <div className="message-meta-bottom">
                          <span id="time">{messageContent.time}</span>
                        </div>
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
              Designed & Developed by <strong className="gradient-text">Ravi Kant</strong>
            </p>
            <p className="footer-skills">
              MCA Graduate | MERN Stack | Graphic Designer
              <br/>
              AI/ML | Big Data & Data Science | Python
            </p>
          </div>
          <div className="social-links">
            <a href="mailto:contact@yourdomain.com" className="email-link">✉️ Contact Me</a>
            <div className="social-badges">
              <a href="https://www.linkedin.com/in/ravikantmahi/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://github.com/Ravikantmahi" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://www.instagram.com/ravikant.mahii" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://reddit.com" target="_blank" rel="noopener noreferrer">Reddit</a>
              <a href="https://kaggle.com" target="_blank" rel="noopener noreferrer">Kaggle</a>
              <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer">Hugging Face</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
