const fs = require('fs');
const filePath = 'd:/Foxdrop/eshop/src/components/AdminWhatsAppTab.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Quitar 'select-none' del contenedor principal del chat y añadir selección de texto en los mensajes
code = code.replace(
  'className="flex-1 overflow-y-auto p-4 space-y-3 relative overscroll-contain"',
  'className="flex-1 overflow-y-auto p-4 space-y-3 relative overscroll-contain select-text"'
);

// En la burbuja del mensaje, añadir 'select-text select-auto' y botón rápido de copiado
const oldBubble = `<div
                      className={\`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 relative text-xs leading-relaxed shadow-sm \${
                        isAdmin
                          ? 'bg-[#005C4B] text-[#E9EDEF] rounded-tr-none'
                          : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none'
                      }\`}
                    >`;

const newBubble = `<div
                      className={\`group max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 relative text-xs leading-relaxed shadow-sm select-text \${
                        isAdmin
                          ? 'bg-[#005C4B] text-[#E9EDEF] rounded-tr-none'
                          : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none'
                      }\`}
                    >`;

if (code.includes(oldBubble)) {
  code = code.replace(oldBubble, newBubble);
  console.log('Added select-text to message bubble');
}

// Añadir botón flotante de copiar en cada mensaje
const oldMessageText = `<p className="whitespace-pre-wrap">{msg.text}</p>`;
const newMessageText = `<div className="relative group/copy">
                          <p className="whitespace-pre-wrap select-text">{msg.text}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(msg.text || '');
                              soundManager.triggerHaptic('light');
                            }}
                            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 group-hover/copy:opacity-100 p-1 bg-black/40 hover:bg-black/70 rounded-md text-[#8696A0] hover:text-[#E9EDEF] transition text-[10px]"
                            title="Copiar mensaje"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>`;

if (code.includes(oldMessageText)) {
  code = code.replace(oldMessageText, newMessageText);
  console.log('Added copy button to text messages');
}

// 2. Renderizar el selector de Stickers y Emojis flotante
const targetForm = `<form onSubmit={handleSendMessage} className="p-2 sm:p-2.5 bg-[#202C33] border-t border-[#222E35] flex items-center gap-1.5 sm:gap-2 safe-area-bottom w-full min-w-0">`;

const stickerAndEmojiPopups = `{/* POPUP DE STICKERS FOXDROP */}
          {showStickerPicker && (
            <div className="bg-[#202C33] border-t border-[#222E35] p-3 max-h-60 overflow-y-auto animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#2A3942]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E9EDEF]">
                  <span>🦊</span>
                  <span>Stickers Oficiales FoxDrop</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStickerPicker(false)}
                  className="p-1 text-[#8696A0] hover:text-[#E9EDEF] rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {brandStickers.map((stk) => (
                  <button
                    key={stk.id}
                    type="button"
                    onClick={() => handleSendSticker(stk)}
                    className="p-1.5 rounded-xl hover:bg-[#2A3942] transition flex flex-col items-center gap-1 group text-center cursor-pointer"
                    title={stk.title}
                  >
                    <img 
                      src={stk.url} 
                      alt={stk.title} 
                      className="w-14 h-14 object-contain group-hover:scale-105 transition"
                      onError={(e) => {
                        // Fallback a PNG si webp no estuviera disponible
                        if (e.currentTarget.src.endsWith('.webp')) {
                          e.currentTarget.src = stk.url.replace('.webp', '.png');
                        }
                      }}
                    />
                    <span className="text-[9px] text-[#8696A0] group-hover:text-[#E9EDEF] truncate max-w-full">
                      {stk.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* POPUP DE EMOJIS */}
          {showEmojiPicker && (
            <div className="bg-[#202C33] border-t border-[#222E35] p-3 max-h-48 overflow-y-auto animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#2A3942]">
                <span className="text-xs font-bold text-[#E9EDEF]">Emojis Rápidos</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="p-1 text-[#8696A0] hover:text-[#E9EDEF] rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {commonEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="text-xl p-2 rounded-xl hover:bg-[#2A3942] transition cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          ` + targetForm;

if (code.includes(targetForm) && !code.includes('POPUP DE STICKERS FOXDROP')) {
  code = code.replace(targetForm, stickerAndEmojiPopups);
  console.log('Injected sticker and emoji popups above form');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Updated AdminWhatsAppTab.tsx successfully!');
