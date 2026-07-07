"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  attachment?: {
    name: string;
    type: string;
    size: string;
  };
};

type Contact = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
  lastSeen?: string;
  unreadCount: number;
  messages: Message[];
};

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "dr-aditi",
    name: "Dr. Aditi Shastri",
    role: "Ayurveda Specialist",
    avatar: "AS",
    online: true,
    unreadCount: 1,
    messages: [
      { id: "m1", senderId: "me", text: "Hello Dr. Aditi, I've started the new diet plan. When should I take the Ashwagandha?", timestamp: "10:30 AM", isRead: true },
      { id: "m2", senderId: "dr-aditi", text: "Hi! That's great. Take 1 teaspoon of Ashwagandha Churna twice daily with warm milk, preferably after meals.", timestamp: "10:45 AM", isRead: true },
      { id: "m3", senderId: "me", text: "Noted. And for the sleep issue?", timestamp: "11:00 AM", isRead: true },
      { id: "m4", senderId: "dr-aditi", text: "I've updated your prescription to include Brahmi Ghrita. Take half a teaspoon before bed.", timestamp: "11:05 AM", isRead: true, attachment: { name: "Prescription_Update_June.pdf", type: "pdf", size: "124 KB" } },
      { id: "m5", senderId: "dr-aditi", text: "Let me know how you feel after a week.", timestamp: "11:06 AM", isRead: false },
    ]
  },
  {
    id: "dr-rajesh",
    name: "Dr. Rajesh Kumar",
    role: "Yoga & Naturopathy",
    avatar: "RK",
    online: false,
    lastSeen: "2 hours ago",
    unreadCount: 0,
    messages: [
      { id: "m1", senderId: "dr-rajesh", text: "Don't forget to practice the breathing exercises (Pranayama) we discussed.", timestamp: "Yesterday", isRead: true },
      { id: "m2", senderId: "me", text: "Yes Dr. Rajesh, doing them every morning!", timestamp: "Yesterday", isRead: true },
    ]
  },
  {
    id: "support",
    name: "MeyVeda Care Team",
    role: "Platform Support",
    avatar: "MV",
    online: true,
    unreadCount: 0,
    messages: [
      { id: "m1", senderId: "support", text: "Welcome to MeyVeda! If you have any issues booking appointments or ordering medicines, we're here to help.", timestamp: "Mon", isRead: true },
    ]
  }
];

export default function MessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [activeContactId, setActiveContactId] = useState<string | null>("dr-aditi");
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeContact = contacts.find(c => c.id === activeContactId);

  useEffect(() => {
    // Scroll to bottom when contact changes or new message added
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeContactId, contacts]);

  useEffect(() => {
    if (activeContactId) {
      // Mark as read
      setContacts(prev => prev.map(c => 
        c.id === activeContactId ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, isRead: true })) } : c
      ));
    }
  }, [activeContactId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
    };

    setContacts(prev => prev.map(c => {
      if (c.id === activeContactId) {
        return { ...c, messages: [...c.messages, newMessage] };
      }
      return c;
    }));

    setInputText("");

    // Simulate reply after 2 seconds if chatting with Dr. Aditi
    if (activeContactId === "dr-aditi") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replyMessage: Message = {
          id: (Date.now() + 1).toString(),
          senderId: "dr-aditi",
          text: "Thanks for the update. Keep up the good work and stay hydrated!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: true,
        };
        setContacts(prev => prev.map(c => 
          c.id === "dr-aditi" ? { ...c, messages: [...c.messages, replyMessage] } : c
        ));
      }, 2500);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen lg:pt-0 bg-background flex overflow-hidden">
      
      {/* Sidebar - Contacts List */}
      <div className={cn(
        "w-full lg:w-80 flex-shrink-0 bg-white border-r border-border flex flex-col transition-all",
        activeContactId ? "hidden lg:flex" : "flex"
      )}>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display text-xl font-bold text-foreground">Messages</h2>
          <div className="mt-4 relative">
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-herb-green/20"
            />
            <svg className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.map(contact => {
            const lastMessage = contact.messages[contact.messages.length - 1];
            return (
              <button
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={cn(
                  "w-full text-left px-5 py-4 border-b border-border/50 hover:bg-muted/50 transition-colors flex items-start gap-3",
                  activeContactId === contact.id ? "bg-herb-green/5 hover:bg-herb-green/5" : ""
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-herb-green/20 to-copper/20 flex items-center justify-center border border-border">
                    <span className="text-foreground font-semibold font-display">{contact.avatar}</span>
                  </div>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-sm font-bold text-foreground truncate">{contact.name}</h3>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {lastMessage?.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{contact.role}</p>
                  <p className={cn(
                    "text-xs truncate",
                    contact.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}>
                    {lastMessage?.senderId === "me" ? "You: " : ""}{lastMessage?.text}
                  </p>
                </div>
                {contact.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-herb-green flex items-center justify-center flex-shrink-0 mt-3">
                    <span className="text-[10px] font-bold text-white">{contact.unreadCount}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeContact ? (
        <div className={cn(
          "flex-1 flex flex-col bg-[#FDFCF8]",
          !activeContactId ? "hidden lg:flex" : "flex"
        )}>
          {/* Chat Header */}
          <div className="px-5 py-4 bg-white border-b border-border flex items-center justify-between flex-shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveContactId(null)}
                className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-herb-green/20 to-copper/20 flex items-center justify-center">
                  <span className="text-foreground font-semibold text-sm font-display">{activeContact.avatar}</span>
                </div>
                {activeContact.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground leading-tight">{activeContact.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeContact.online ? "Online" : `Last seen ${activeContact.lastSeen}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>
              <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </button>
              <button className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="flex justify-center mb-8">
              <span className="text-[10px] font-semibold text-muted-foreground bg-black/5 px-3 py-1 rounded-full">
                End-to-End Encrypted (ABDM Compliant)
              </span>
            </div>

            {activeContact.messages.map((msg, i) => {
              const isMe = msg.senderId === "me";
              const showAvatar = !isMe && (i === 0 || activeContact.messages[i-1].senderId === "me");
              
              return (
                <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[80%] lg:max-w-[60%]", isMe ? "flex-row-reverse" : "flex-row")}>
                    
                    {/* Avatar for remote user */}
                    {!isMe && (
                      <div className="w-8 flex-shrink-0 mr-3">
                        {showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-herb-green/20 to-copper/20 flex items-center justify-center self-end">
                            <span className="text-[10px] font-bold font-display">{activeContact.avatar}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl shadow-sm text-sm",
                        isMe 
                          ? "bg-herb-green text-white rounded-tr-sm" 
                          : "bg-white border border-border text-foreground rounded-tl-sm"
                      )}>
                        {msg.text}
                        
                        {msg.attachment && (
                          <div className={cn(
                            "mt-3 p-3 rounded-xl flex items-center gap-3 border",
                            isMe ? "bg-white/10 border-white/20" : "bg-muted/50 border-border"
                          )}>
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isMe ? "bg-white/20" : "bg-white")}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-semibold truncate", isMe ? "text-white" : "text-foreground")}>{msg.attachment.name}</p>
                              <p className={cn("text-[10px]", isMe ? "text-white/70" : "text-muted-foreground")}>{msg.attachment.size} · PDF</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {msg.timestamp} {isMe && <span className="text-herb-green ml-1">✓✓</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex w-full justify-start">
                <div className="flex max-w-[80%] flex-row">
                  <div className="w-8 flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-herb-green/20 to-copper/20 flex items-center justify-center self-end">
                      <span className="text-[10px] font-bold font-display">{activeContact.avatar}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-10">
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 bg-white border-t border-border flex-shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <button type="button" className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-muted/50 border border-border rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-herb-green/30"
              />
              
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-full bg-herb-green text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-herb-green/90 flex-shrink-0 shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-0.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-[#FDFCF8]">
          <div className="text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-white border border-border flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="font-semibold text-foreground">Select a conversation</p>
            <p className="text-sm">Choose a contact to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
