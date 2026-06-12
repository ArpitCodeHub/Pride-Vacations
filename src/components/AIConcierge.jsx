import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { api } from "../lib/api";

export default function AIConcierge() {
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "I'm the Pride Vacations concierge. Tell me what you're dreaming of — a forest hideaway, a palace evening, an ocean morning — and I'll begin to sketch it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const r = await api.post("/concierge", {
        conversation_id: convId,
        message: userMsg.content,
      });
      setConvId(r.data.conversation_id);
      setMessages((m) => [...m, { role: "assistant", content: r.data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I'm having a quiet moment of trouble — please try again, or reach our human team via WhatsApp." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="ai-concierge-trigger"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 bg-ink text-cream rounded-full shadow-2xl hover:bg-gold hover:text-ink transition-all border border-white/10"
      >
        {open ? <X size={18} /> : <Sparkles size={18} className="text-gold" />}
        <span className="text-xs uppercase tracking-[0.25em]">
          {open ? "Close" : "Concierge"}
        </span>
      </button>

      {open && (
        <div
          data-testid="ai-concierge-panel"
          className="fixed bottom-24 right-6 z-[60] w-[calc(100vw-3rem)] md:w-[420px] h-[560px] bg-ink/95 backdrop-blur-2xl text-cream border border-white/10 shadow-2xl flex flex-col"
        >
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="font-display text-lg leading-none">Pride Concierge</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gold mt-1">
                Always at your service
              </div>
            </div>
            <Sparkles size={16} className="text-gold" />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                data-testid={`concierge-msg-${m.role}-${i}`}
                className={`max-w-[85%] text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-gold/90 text-ink px-4 py-3 rounded-sm"
                    : "mr-auto text-cream/90 font-display text-base"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div data-testid="concierge-typing" className="text-cream/40 text-xs italic">
                Thinking…
              </div>
            )}
          </div>

          <div className="px-4 py-4 border-t border-white/10 flex items-end gap-2">
            <textarea
              data-testid="concierge-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Tell me what you're dreaming of…"
              className="flex-1 bg-transparent border-b border-white/20 focus:border-gold outline-none text-sm py-2 resize-none placeholder:text-cream/30"
            />
            <button
              data-testid="concierge-send"
              type="button"
              onClick={send}
              disabled={!input.trim() || sending}
              className="p-2.5 bg-gold text-ink hover:bg-cream disabled:opacity-30 transition"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
