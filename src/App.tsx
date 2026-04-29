/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'motion/react';
import { 
    Play, RotateCcw, Undo2, CheckCircle2, ChevronRight, ChevronsRight, 
    ShoppingCart, Settings, Lock, Star, Coins, Hammer, Shuffle, Ghost, PlusCircle, ArrowLeft, Eye, ArrowRight, Heart, Video
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdOptions, AdLoadInfo, RewardAdPluginEvents } from '@capacitor-community/admob';
import splashImg from './assets/splash.webp';
import menuBgImg from './assets/menu_bg.webp';
import shopBgImg from './assets/shop_bg.webp';
import logoImg from './assets/logo.webp';
import { LEVELS, BlockData } from './levels';
import { audio } from './audio';
import { getConstraints, generateLevel } from './generator';

// Hook to get responsive board size
function useBoardSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const update = () => {
      // make it square based on width
      const w = ref.current?.clientWidth || 0;
      setSize(w);
    };
    update();
    const ob = new ResizeObserver(update);
    ob.observe(ref.current);
    return () => ob.disconnect();
  }, [ref]);
  return size;
}

const getTheme = (block: BlockData) => {
    if (block.type === 'target') {
        return {
            border: 'border-[#ff5e5e]',
            bg: 'bg-[#1a0505]',
            shadow: 'shadow-[0_0_15px_rgba(255,94,94,0.4)]',
            element: 'bg-[#ff5e5e] shadow-[0_0_10px_#ff5e5e]',
            glowInset: 'shadow-[inset_0_0_20px_rgba(255,94,94,0.15)]',
        };
    }
    
    const themes = [
        {
            border: 'border-[#ffaa00]',
            bg: 'bg-[#1a1000]',
            shadow: 'shadow-[0_0_15px_rgba(255,170,0,0.4)]',
            element: 'bg-[#ffaa00] shadow-[0_0_10px_#ffaa00]',
            glowInset: 'shadow-[inset_0_0_20px_rgba(255,170,0,0.15)]',
        },
        {
            border: 'border-[#00ffff]',
            bg: 'bg-[#001a1a]',
            shadow: 'shadow-[0_0_15px_rgba(0,255,255,0.4)]',
            element: 'bg-[#00ffff] shadow-[0_0_10px_#00ffff]',
            glowInset: 'shadow-[inset_0_0_20px_rgba(0,255,255,0.15)]',
        },
        {
            border: 'border-[#5e8eff]',
            bg: 'bg-[#050b1a]',
            shadow: 'shadow-[0_0_15px_rgba(94,142,255,0.4)]',
            element: 'bg-[#5e8eff] shadow-[0_0_10px_#5e8eff]',
            glowInset: 'shadow-[inset_0_0_20px_rgba(94,142,255,0.15)]',
        },
        {
            border: 'border-[#00ff88]',
            bg: 'bg-[#001a0d]',
            shadow: 'shadow-[0_0_15px_rgba(0,255,136,0.4)]',
            element: 'bg-[#00ff88] shadow-[0_0_10px_#00ff88]',
            glowInset: 'shadow-[inset_0_0_20px_rgba(0,255,136,0.15)]',
        },
        {
           border: 'border-[#d400ff]',
           bg: 'bg-[#15001a]',
           shadow: 'shadow-[0_0_15px_rgba(212,0,255,0.4)]',
           element: 'bg-[#d400ff] shadow-[0_0_10px_#d400ff]',
           glowInset: 'shadow-[inset_0_0_20px_rgba(212,0,255,0.15)]',
        }
    ];
    // Deterministic color based on id
    return themes[(block.id - 1) % themes.length];
}

const BlockView = ({ block, blocks, cellSize, onMove, hasWon, isHammerActive, onHammerUse, isGhostActive }: { key?: React.Key, block: BlockData, blocks: BlockData[], cellSize: number, onMove: (id: number, newGrid: number) => void, hasWon: boolean, isHammerActive: boolean, onHammerUse: (id: number) => void, isGhostActive?: boolean }) => {
    const { minGrid, maxGrid } = getConstraints(block, blocks, isGhostActive);
    const x = useMotionValue(block.dir === 'H' ? block.x * cellSize : 0);
    const y = useMotionValue(block.dir === 'V' ? block.y * cellSize : 0);

    useEffect(() => {
        if (block.dir === 'H') {
            const targetX = (hasWon && block.type === 'target') ? (cellSize * 7.5) : block.x * cellSize;
            const transition = (hasWon && block.type === 'target') ? { duration: 1.2, ease: "easeIn" } : { type: 'spring', bounce: 0, duration: 0.2 };
            animate(x, targetX as any, transition as any);
        }
        if (block.dir === 'V') animate(y, (block.y * cellSize) as any, { type: 'spring', bounce: 0, duration: 0.2 } as any);
    }, [block.x, block.y, cellSize, block.dir, x, y, hasWon, block.type]);

    const isGhostMode = isGhostActive && block.type === 'target';

    const style: React.CSSProperties = {
        position: 'absolute',
        opacity: isGhostMode ? 0.6 : 1,
        filter: isGhostMode ? 'hue-rotate(90deg) brightness(1.2) drop-shadow(0_0_15px_#00ffff)' : 'none',
    };
    
    if (block.dir === 'H') {
        style.width = block.size * cellSize;
        style.height = cellSize;
        style.left = 0;
        style.top = block.y * cellSize;
        style.x = x as any;
    } else {
        style.width = cellSize;
        style.height = block.size * cellSize;
        style.left = block.x * cellSize;
        style.top = 0;
        style.y = y as any;
    }

    const theme = getTheme(block);

    return (
        <motion.div
            layoutId={block.id.toString()}
            className="will-change-transform p-[3px] cursor-grab active:cursor-grabbing z-10 box-border"
            exit={{ 
                scale: 1.5,
                opacity: 0,
                rotate: Math.random() > 0.5 ? 45 : -45,
                filter: "brightness(2) blur(8px)",
                transition: { duration: 0.4 }
            }}
            style={style}
            drag={block.dir === 'H' ? 'x' : 'y'}
            dragConstraints={
                block.dir === 'H' 
                ? { left: minGrid * cellSize, right: maxGrid * cellSize }
                : { top: minGrid * cellSize, bottom: maxGrid * cellSize }
            }
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => audio.playTap()}
            onDragEnd={(e, info) => {
                const val = block.dir === 'H' ? x.get() : y.get();
                let newGrid = Math.round(val / cellSize);
                newGrid = Math.max(minGrid, Math.min(newGrid, maxGrid));
                
                if (newGrid !== (block.dir === 'H' ? block.x : block.y)) {
                    audio.playSlide();
                    onMove(block.id, newGrid);
                } else {
                    audio.playError();
                    if (block.dir === 'H') animate(x, block.x * cellSize, { type: 'spring', bounce: 0 });
                    if (block.dir === 'V') animate(y, block.y * cellSize, { type: 'spring', bounce: 0 });
                }
            }}
            whileDrag={{ scale: 1.05, zIndex: 50 }}
            initial={{ zIndex: 10 }}
            onClick={() => {
                if (isHammerActive && block.type !== 'target') {
                    onHammerUse(block.id);
                }
            }}
        >
           <div className={`w-full h-full rounded-[14px] flex border-2 overflow-hidden relative box-border ${theme.bg} ${theme.border} ${theme.shadow} ${theme.glowInset} ${isHammerActive && block.type !== 'target' ? 'animate-pulse' : ''}`}>
               {isHammerActive && block.type !== 'target' && (
                   <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-30">
                       <Hammer className="w-8 h-8 text-red-500 animate-bounce" />
                   </div>
               )}
               
               {/* Faint internal block dividers */}
               <div className={`absolute inset-0 flex ${block.dir === 'H' ? 'flex-row' : 'flex-col'}`}>
                   {Array.from({length: block.size}).map((_, i) => (
                       <div key={i} className={`flex-1 relative ${i < block.size - 1 ? (block.dir === 'H' ? 'border-r border-white/5' : 'border-b border-white/5') : ''}`}>
                       </div>
                   ))}
               </div>

               {/* Dots in corners */}
               <div className={`absolute top-[6px] left-[6px] w-[5px] h-[5px] rounded-full ${theme.element}`} />
               <div className={`absolute bottom-[6px] right-[6px] w-[5px] h-[5px] rounded-full ${theme.element}`} />

               {/* Central Track / Thick Line */}
               <div className={`absolute flex items-center justify-center pointer-events-none
                 ${block.dir === 'H' 
                   ? 'top-1/2 -translate-y-1/2 left-[14px] right-[14px] h-[10px]' 
                   : 'left-1/2 -translate-x-1/2 top-[14px] bottom-[14px] w-[10px]'
                 }`}
               >
                   {/* Main neon core */}
                   <div className={`w-full h-full rounded-full ${theme.element} opacity-[0.85]`} />
                   
                   {/* Grip/Thumb highlight */}
                   <div className={`absolute rounded-full bg-white/40 border border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.4)]
                       ${block.dir === 'H' 
                         ? 'right-[-2px] h-[18px] w-[26px] top-1/2 -translate-y-1/2' 
                         : 'top-[-2px] w-[18px] h-[26px] left-1/2 -translate-x-1/2'
                       }`} 
                    />
               </div>
           </div>
        </motion.div>
    )
}

const PowerUpButton = ({ 
    id, 
    icon: Icon, 
    label, 
    ringColor, 
    iconColor,
    count, 
    isActive, 
    disabled, 
    onClick 
}: { 
    id: string, 
    icon: any, 
    label: string, 
    ringColor: string, 
    iconColor: string,
    count: number, 
    isActive?: boolean, 
    disabled?: boolean, 
    onClick: () => void 
}) => {
    return (
        <div className="flex flex-col items-center gap-2 flex-1">
            <button
                onClick={onClick}
                className={`relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center transition-all duration-300 group ${
                    disabled ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-90'
                }`}
            >
                {/* Segmented Neon Ring Animation */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    {/* Background Ring Path */}
                    <circle 
                        cx="50%" cy="50%" r="45%" 
                        fill="transparent" 
                        stroke="rgba(255,255,255,0.05)" 
                        strokeWidth="2" 
                    />
                    {/* Segmented Ring (Dash Array) */}
                    <motion.circle 
                        cx="50%" cy="50%" r="45%" 
                        fill="transparent" 
                        stroke={isActive ? '#ffffff' : ringColor} 
                        strokeWidth={isActive ? "3" : "2"}
                        strokeDasharray="15 5"
                        animate={isActive ? { strokeDashoffset: [0, 100], strokeWidth: [3, 5, 3] } : {}}
                        transition={isActive ? { duration: 5, repeat: Infinity, ease: "linear" } : {}}
                        style={{ filter: `drop-shadow(0 0 8px ${isActive ? '#ffffff' : ringColor})` }}
                        className="transition-colors duration-300"
                    />
                    
                    {/* Inner thin glow ring */}
                    <circle 
                        cx="50%" cy="50%" r="38%" 
                        fill="transparent" 
                        stroke={ringColor} 
                        strokeWidth="0.5" 
                        strokeOpacity="0.3"
                    />
                </svg>

                {/* Content Icon */}
                <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Icon className="w-6 h-6 md:w-7 md:h-7" style={{ color: isActive ? '#fff' : iconColor, filter: `drop-shadow(0 0 5px ${iconColor})` }} />
                    {id === 'moveBoost' && (
                        <div className="absolute -bottom-1 -right-1 text-[8px] font-black" style={{ color: iconColor }}>+5</div>
                    )}
                </div>

                {/* Badge Count */}
                <div className={`absolute -bottom-1 -right-0 min-w-[20px] h-5 px-1 bg-white text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_2px_5px_rgba(0,0,0,0.5)] z-20 border border-black/20`}>
                    {count}
                </div>

                {/* Active Pulse */}
                {isActive && (
                    <motion.div 
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.4, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: ringColor }}
                    />
                )}
            </button>
            <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] uppercase transition-colors duration-300 ${isActive ? 'text-white' : ''}`} style={{ color: isActive ? '#fff' : `${ringColor}cc`, textShadow: isActive ? `0 0 8px ${ringColor}` : 'none' }}>
                {label}
            </span>
        </div>
    );
};

const SuccessScreen = ({ 
    levelIndex, 
    moves, 
    minMoves, 
    onNext, 
    onDoubleReward 
}: { 
    levelIndex: number, 
    moves: number, 
    minMoves: number, 
    onNext: (claimedCoins: number, stars: number) => void,
    onDoubleReward: () => void
}) => {
    const stars = moves <= minMoves ? 3 : moves <= minMoves + 1 ? 2 : 1;
    const baseReward = 5;
    const [isWatchAd, setIsWatchAd] = useState(false);
    const [rewardMultiplier, setRewardMultiplier] = useState(1);

    const handleDouble = () => {
        setIsWatchAd(true);
        audio.playCollect();
        setTimeout(() => {
            setRewardMultiplier(2);
            setIsWatchAd(false);
            onDoubleReward();
        }, 2000);
    };

    const handleNext = () => {
        audio.playTap();
        onNext(baseReward * rewardMultiplier, stars);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#02050a]/98 backdrop-blur-lg overflow-y-auto"
        >
            <motion.div 
                initial={{ scale: 0.8, opacity: 0, scaleY: 0 }}
                animate={{ scale: 1, opacity: 1, scaleY: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="relative w-full max-w-[340px] flex flex-col items-center bg-[#050b14]/98 border border-[#00ffff]/40 rounded-[32px] p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.9)] h-fit max-h-[95vh] overflow-y-auto overflow-x-hidden no-scrollbar"
                style={{
                    clipPath: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)'
                }}
            >
                {/* Tech Accents - Hexagon Pattern */}
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                    <svg width="100%" height="100%" className="text-[#00ffff]">
                        <pattern id="hex-pattern" width="24" height="41.56" patternUnits="userSpaceOnUse" viewBox="0 0 24 41.56">
                            <path d="M12 0L24 6.92v13.85L12 27.69 0 20.77V6.92z" fill="none" stroke="currentColor" strokeWidth="1" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#hex-pattern)" />
                    </svg>
                </div>
                
                {/* Decorative Circuits */}
                <div className="absolute top-0 left-0 w-full h-full border border-[#00ffff]/20 pointer-events-none z-10" />
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00ffff] to-transparent shadow-[0_0_20px_#00ffff]" />
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00ffff] to-transparent shadow-[0_0_20px_#00ffff]" />

                {/* Animated corner tabs */}
                <div className="absolute top-[8%] left-0 w-1 h-12 bg-[#00ffff] shadow-[0_0_10px_#00ffff]" />
                <div className="absolute top-[8%] right-0 w-1 h-12 bg-[#00ffff] shadow-[0_0_10px_#00ffff]" />
                <div className="absolute bottom-[8%] left-0 w-1 h-12 bg-[#00ffff] shadow-[0_0_10px_#00ffff]" />
                <div className="absolute bottom-[8%] right-0 w-1 h-12 bg-[#00ffff] shadow-[0_0_10px_#00ffff]" />

                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.95, 1, 0.95] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="flex flex-col items-center mt-2 relative"
                >
                    {/* Primary Glow */}
                    <div className="absolute inset-0 bg-[#00ffff]/20 blur-[30px] rounded-full -z-10" />
                    
                    <img src={logoImg} alt="Logo" className="w-[160px] h-auto drop-shadow-[0_0_20px_rgba(0,255,255,0.7)] mb-4 brightness-125 saturate-150" />
                    <div className="flex flex-col items-center">
                        <p className="text-[#00ffff]/90 text-[12px] font-black tracking-[0.6em] uppercase mb-1">MISSION CLEAR</p>
                        <div className="h-[2px] w-16 bg-gradient-to-r from-transparent via-[#00ffff] to-transparent mb-4" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-[#00ffff] text-center tracking-[0.08em] uppercase"
                        style={{ WebkitTextStroke: '1px rgba(0,255,255,0.5)' }}>
                        LEVEL {levelIndex + 1}
                    </h2>
                </motion.div>

                {/* Stars container with glow */}
                <div className="relative flex gap-1.5 my-8 md:my-12">
                    <div className="absolute inset-x-[-40px] inset-y-[-20px] bg-[#ffaa00]/10 blur-3xl rounded-full -z-10" />
                    {[1, 2, 3].map((s) => (
                        <motion.div
                            key={s}
                            initial={{ scale: 0, y: 30 }}
                            animate={{ scale: s <= stars ? 1 : 0.8, y: 0 }}
                            transition={{ delay: 0.6 + s * 0.15, type: 'spring', stiffness: 200 }}
                            className="relative"
                        >
                            <Star 
                                className={`w-16 h-16 ${s <= stars ? 'text-[#ffaa00] fill-[#ffaa00]' : 'text-white/5 fill-white/5'}`} 
                                strokeWidth={s <= stars ? 0.5 : 2}
                            />
                            {s <= stars && (
                                <motion.div 
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: s * 0.4 }}
                                    className="absolute inset-0 bg-[#ffaa00] rounded-full blur-[12px] -z-10"
                                />
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="mt-auto w-full flex flex-col gap-4 mb-10">
                    <p className="text-white/60 text-[11px] font-black tracking-[0.4em] uppercase text-center mb-1">YOUR REWARD</p>
                    
                    {/* Main Claim Button */}
                    <button 
                        onClick={handleNext}
                        className="relative group w-full h-[60px] bg-gradient-to-r from-[#00ffff] to-[#0088ff] rounded-2xl flex items-center justify-center overflow-hidden active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.25)]"
                    >
                        <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
                        <div className="relative flex items-center justify-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-black">
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                            <span className="text-black font-black tracking-widest text-lg">CLAIM REWARD</span>
                        </div>
                        {/* Continuous shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                    </button>

                    {/* Double Reward Button */}
                    <button 
                        onClick={handleDouble}
                        disabled={rewardMultiplier > 1 || isWatchAd}
                        className={`relative group w-full h-[60px] bg-gradient-to-r from-[#ffaa00] to-[#ff6600] rounded-2xl flex items-center justify-center overflow-hidden active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,170,0,0.25)] ${rewardMultiplier > 1 ? 'opacity-40 grayscale' : ''}`}
                    >
                        {isWatchAd ? (
                             <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                                <span className="text-black font-black tracking-widest text-sm">LOADING...</span>
                            </div>
                        ) : (
                            <div className="relative flex items-center justify-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-black">
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start justify-center">
                                    <span className="text-black font-black tracking-widest text-sm leading-tight">DOUBLE REWARD</span>
                                    <span className="text-black/60 font-bold text-[9px] tracking-widest leading-none">(WATCH AD)</span>
                                </div>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                    </button>

                    {/* Next Level Button */}
                    <button 
                        onClick={handleNext}
                        className="group relative w-full h-[60px] bg-white/[0.03] border-2 border-[#00ffff]/30 rounded-2xl flex items-center justify-center hover:bg-[#00ffff]/10 active:scale-95 transition-all mt-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#00ffff]/10 flex items-center justify-center text-[#00ffff]">
                                <ChevronsRight className="w-5 h-5" />
                            </div>
                            <span className="text-[#00ffff] font-black tracking-widest text-base">NEXT LEVEL</span>
                        </div>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

function GameScreen({ levelIndex, unlockedLevel, isUnlocked, onBack, onComplete, onRestart, coins, setCoins, powerups, setPowerups, lives, setLives, onOutOfLives }: { levelIndex: number, unlockedLevel: number, isUnlocked: boolean, onBack: () => void, onComplete: (moves: number, stars: number, claimedReward: number) => void, onRestart: () => void, coins: number, setCoins: React.Dispatch<React.SetStateAction<number>>, powerups: PowerUpInventory, setPowerups: React.Dispatch<React.SetStateAction<PowerUpInventory>>, lives: number, setLives: React.Dispatch<React.SetStateAction<number>>, onOutOfLives: () => void }) {
  const [levelData, setLevelData] = useState<{blocks: BlockData[], maxMoves: number, minMoves: number} | null>(null);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [history, setHistory] = useState<BlockData[][]>([]);
  const [moves, setMoves] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [isGhostActive, setIsGhostActive] = useState(false);
  const [bonusMoves, setBonusMoves] = useState(0);

  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillItem, setRefillItem] = useState<{id: PowerUpType, name: string} | null>(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  const handleRefillAd = async () => {
      setIsWatchingAd(true);
      audio.playCollect();
      
      if (Capacitor.isNativePlatform()) {
          try {
              // Show the rewarded video
              const reward = await AdMob.showRewardVideoAd();
              console.log('Reward:', reward);
              
              // Only grant reward if successful
              setPowerups(prev => ({ ...prev, [refillItem!.id]: (prev[refillItem!.id] || 0) + 1 }));
              
              // Prepare next ad
              await AdMob.prepareRewardVideoAd({
                  adId: 'ca-app-pub-3940256099942544/5224354917',
              });
          } catch(e) {
              console.error('AdMob Error', e);
          } finally {
              setIsWatchingAd(false);
              setShowRefillModal(false);
              setRefillItem(null);
          }
      } else {
          // Dev preview fallback
          setTimeout(() => {
              setPowerups(prev => ({ ...prev, [refillItem!.id]: (prev[refillItem!.id] || 0) + 1 }));
              setIsWatchingAd(false);
              setShowRefillModal(false);
              setRefillItem(null);
          }, 3000);
      }
  };

  const handleRefillCoins = () => {
      if (coins >= 30) {
          audio.playCollect();
          setCoins(c => c - 30);
          setPowerups(prev => ({ ...prev, [refillItem!.id]: (prev[refillItem!.id] || 0) + 3 }));
          setShowRefillModal(false);
          setRefillItem(null);
      } else {
          audio.playError();
      }
  };
  
  const boardRef = useRef<HTMLDivElement>(null);
  const boardSize = useBoardSize(boardRef);
  const cellSize = boardSize / 6;

  useEffect(() => {
     setIsLoading(true);
     // Small timeout to allow UI to render loading state before heavy generation
     setTimeout(() => {
         const data = generateLevel(levelIndex);
         setLevelData(data);
         setBlocks(JSON.parse(JSON.stringify(data.blocks)));
         setHistory([]);
         setMoves(0);
         setHasWon(false);
         setHasFailed(false);
         setIsLoading(false);
     }, 10);
  }, [levelIndex]);

  useEffect(() => {
     if (hasWon || hasFailed) {
         audio.stopGameBGM();
     } else {
         audio.playGameBGM();
     }
     
     return () => {
         audio.stopGameBGM();
     };
  }, [hasWon, hasFailed]);
  
  useEffect(() => {
     if (hasWon || hasFailed || isExiting) return;
     const target = blocks.find(b => b.type === 'target');
     if (target && target.x === 6 - target.size) {
         setIsExiting(true);
         audio.playWin();
         
         // Wait for animation to finish before showing success screen
         setTimeout(() => {
             setHasWon(true);
         }, 1300);
     } else if (levelData && moves >= levelData.maxMoves) {
         setHasFailed(true);
         setLives(prev => Math.max(0, prev - 1));
         audio.playError();
     }
  }, [blocks, levelData, moves, hasWon, hasFailed, isExiting]);

  const handleMove = (id: number, newGrid: number) => {
      if (hasWon || hasFailed) return;
      setHistory(prev => [...prev, blocks]);
      setBlocks(prev => prev.map(b => {
         if (b.id !== id) return b;
         return { ...b, [b.dir === 'H' ? 'x' : 'y']: newGrid };
      }));
      setMoves(m => m + 1);
      
      if (isGhostActive) {
          setIsGhostActive(false);
      }
  };

  const usePowerUp = (type: PowerUpType) => {
    const count = powerups[type] || 0;
    if (hasWon || hasFailed || isLoading) return;
    
    if (count <= 0) {
        audio.playError();
        const names: Record<PowerUpType, string> = { hammer: 'SHATTER', moveBoost: 'MOVE +5', shuffle: 'SHUFFLE', ghost: 'GHOST', undo: 'UNDO' };
        setRefillItem({ id: type, name: names[type] });
        setShowRefillModal(true);
        return;
    }

      if (type === 'hammer') {
          setActivePowerUp(prev => prev === 'hammer' ? null : 'hammer');
          audio.playTap();
      } else if (type === 'moveBoost') {
          setBonusMoves(prev => prev + 5);
          setPowerups(prev => ({ ...prev, [type]: (prev[type] || 0) - 1 }));
          audio.playWin();
          
          const effectId = Math.random().toString();
          setActiveEffects(prev => [...prev, { id: effectId, type: 'boost', x: 0, y: 0 }]);
          setTimeout(() => setActiveEffects(prev => prev.filter(e => e.id !== effectId)), 1000);
      } else if (type === 'ghost') {
          setIsGhostActive(true);
          setPowerups(prev => ({ ...prev, [type]: (prev[type] || 0) - 1 }));
          audio.playWin();

          const effectId = Math.random().toString();
          setActiveEffects(prev => [...prev, { id: effectId, type: 'ghost_on', x: 0, y: 0 }]);
          setTimeout(() => setActiveEffects(prev => prev.filter(e => e.id !== effectId)), 1000);
      } else if (type === 'shuffle') {
          // Better shuffle: swap positions of blocks with same orientation and size
          audio.playWin();
          setPowerups(prev => ({ ...prev, [type]: (prev[type] || 0) - 1 }));

          const effectId = Math.random().toString();
          setActiveEffects(prev => [...prev, { id: effectId, type: 'shuffle', x: 0, y: 0 }]);
          setTimeout(() => setActiveEffects(prev => prev.filter(e => e.id !== effectId)), 800);

          setBlocks(prev => {
              const target = prev.find(b => b.type === 'target')!;
              const others = prev.filter(b => b.type !== 'target');
              const newBlocks = [...prev];
              
              // Group compatible blocks
              const groups: Record<string, number[]> = {};
              others.forEach((b, idx) => {
                  const key = `${b.dir}-${b.size}`;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(idx);
              });
              
              // Swap within groups
              Object.values(groups).forEach(indices => {
                  if (indices.length < 2) return;
                  const originalPositions = indices.map(idx => ({ x: others[idx].x, y: others[idx].y }));
                  const shuffledPositions = [...originalPositions].sort(() => Math.random() - 0.5);
                  indices.forEach((idx, i) => {
                      others[idx] = { ...others[idx], ...shuffledPositions[i] };
                  });
              });
              
              return [target, ...others];
          });
      }
  };

  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string, vx: number, vy: number}[]>([]);
  const [activeEffects, setActiveEffects] = useState<{id: string, type: string, x: number, y: number}[]>([]);

  const [shake, setShake] = useState(false);
  
  const triggerShake = () => {
      setShake(true);
      setTimeout(() => setShake(false), 300);
  };

  const createParticles = (x: number, y: number, color: string, count = 16) => {
      const newParticles = Array.from({ length: count }).map((_, i) => ({
          id: Date.now() + i + Math.random(),
          x,
          y,
          color,
          vx: (Math.random() - 0.5) * 25,
          vy: (Math.random() - 0.5) * 25
      }));
      setParticles(prev => [...prev, ...newParticles]);
      setTimeout(() => {
          setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 1000);
  };

  const handleHammerUse = (id: number) => {
      const block = blocks.find(b => b.id === id);
      if (block) {
          audio.playShatter(); 
          triggerShake();
          createParticles(block.x * 50 + 25, block.y * 50 + 25, block.color, 24);
      }
      setBlocks(prev => prev.filter(b => b.id !== id));
      setPowerups(prev => ({ ...prev, hammer: (prev.hammer || 0) - 1 }));
      setActivePowerUp(null);
  };

  const handleUndo = () => {
      const undoCount = powerups.undo || 0;
      if (hasWon || hasFailed || isLoading) return;
      
      if (undoCount <= 0) {
          audio.playError();
          setRefillItem({ id: 'undo', name: 'BACKTRACK' });
          setShowRefillModal(true);
          return;
      }

      if (history.length === 0) {
          // Play a "subtle" error sound or just provide visual feedback
          audio.playError();
          return;
      }

      // Add rewind effect
      const effectId = Math.random().toString();
      setActiveEffects(prev => [...prev, { id: effectId, type: 'rewind', x: 0, y: 0 }]);
      setTimeout(() => setActiveEffects(prev => prev.filter(e => e.id !== effectId)), 800);

      audio.playTap();
      const prev = history[history.length - 1];
      setBlocks(prev);
      setHistory(h => h.slice(0, -1));
      setMoves(m => Math.max(0, m - 1));
      setPowerups(prev => ({ ...prev, undo: Math.max(0, (prev.undo || 0) - 1) }));
  };
  
  const handleRestart = () => {
      setShowRestartConfirm(false);
      if (!levelData) return;
      if (lives <= 0) {
          audio.playError();
          onOutOfLives();
          return;
      }
      if (!hasFailed) {
          setLives(prev => Math.max(0, prev - 1));
      }
      audio.playTap();
      setBlocks(JSON.parse(JSON.stringify(levelData.blocks)));
      setHistory([]);
      setMoves(0);
      setHasWon(false);
      setHasFailed(false);
  };

  const handleRestartClick = () => {
      if (hasFailed) {
          handleRestart();
      } else {
          audio.playTap();
          setShowRestartConfirm(true);
      }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#02050a] flex flex-col overflow-hidden select-none">
        {/* Header HUD: Compact for mobile */}
        <div className="w-full h-16 md:h-20 flex justify-between items-center px-4 z-30 shrink-0">
            <button 
                onClick={() => { audio.playTap(); onBack(); }}
                className="w-10 h-10 rounded-xl bg-[#030712] border border-[#00ffff]/30 text-[#00ffff] flex items-center justify-center hover:bg-[#00ffff]/10 transition-all active:scale-95"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center bg-[#050b14]/40 px-6 py-1 rounded-full border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                <h2 className="text-xs md:text-sm font-black text-[#00ffff] tracking-[0.3em] uppercase leading-tight mb-0.5">LEVEL {levelIndex + 1}</h2>
                <div className="flex gap-1.5">
                    {[...Array(3)].map((_, i) => (
                       <Star key={i} className={`w-3.5 h-3.5 ${i < 3 ? 'text-[#ffaa00] fill-[#ffaa00] drop-shadow-[0_0_5px_#ffaa00]' : 'text-white/10'}`} strokeWidth={i < 3 ? 0 : 2} />
                    ))}
                </div>
            </div>
            
            <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-[#ffaa00]/40 to-transparent rounded-xl blur-[1px]" />
                <div className="relative h-11 px-4 flex flex-col justify-center items-end bg-[#0a0f1a] border border-[#ffaa00]/20 rounded-xl min-w-[85px] shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_0_15px_rgba(255,170,0,0.05)] overflow-hidden">
                    {/* Background Tech Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ffaa00 0, #ffaa00 1px, transparent 0, transparent 4px)', backgroundSize: '8px 8px' }} />
                    
                    {/* Segmented Detail */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ffaa00]/30 to-transparent" />
                    
                    <p className="text-[7px] font-black text-[#ffaa00] tracking-[0.25em] uppercase leading-none mb-1 translate-x-[-2px]">MOVES</p>
                    <div className="flex items-baseline gap-1 leading-none">
                        <span className={`text-xl font-black font-mono tracking-tighter transition-all duration-300 ${moves > (levelData?.maxMoves || 0) + bonusMoves * 0.8 ? 'text-[#ff5e5e] drop-shadow-[0_0_8px_#ff5e5e]' : 'text-[#ffaa00] drop-shadow-[0_0_10px_rgba(255,170,0,0.6)]'}`}>
                            {moves}
                        </span>
                        <span className="text-white/20 text-[11px] font-black font-mono">/</span>
                        <span className="text-white/40 text-[11px] font-black font-mono">{(levelData?.maxMoves || 0) + bonusMoves}</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Board Container Area: Flex-1 to occupy remaining space centers the board */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-2 min-h-0 relative">
            {/* Background Exit Visuals (The Back of the Cave) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-16 translate-x-full pointer-events-none z-0">
                <div className="w-full h-full bg-[#ff2a2a]/20 blur-xl animate-pulse" />
            </div>

            <motion.div 
                ref={boardRef} 
                animate={shake ? { x: [-5, 5, -5, 5, 0], y: [-2, 2, -2, 2, 0] } : {}}
                className="relative w-full max-w-[min(100%,400px)] aspect-square bg-[#030914] rounded-[24px] md:rounded-[32px] border-2 border-slate-800 shadow-2xl overflow-hidden box-border"
            >
                {/* Particles Layer */}
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                        animate={{ 
                            x: p.x + p.vx * 10, 
                            y: p.y + p.vy * 10, 
                            scale: 0, 
                            opacity: 0,
                            rotate: Math.random() * 360
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute w-3 h-3 rounded-sm pointer-events-none z-50"
                        style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
                    />
                ))}

                {/* Full Screen Effects */}
                <AnimatePresence>
                    {activeEffects.map(effect => (
                        <motion.div
                            key={effect.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center"
                        >
                            {effect.type === 'rewind' && (
                                <motion.div 
                                    initial={{ scale: 2, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-full h-full border-[20px] border-[#00ffff]/20 flex items-center justify-center"
                                >
                                    <div className="bg-[#00ffff]/10 p-6 rounded-full blur-xl animate-pulse" />
                                    <Undo2 className="w-24 h-24 text-[#00ffff] opacity-30 absolute" />
                                </motion.div>
                            )}
                            {effect.type === 'boost' && (
                                <motion.div 
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: -50, opacity: 1 }}
                                    className="flex flex-col items-center"
                                >
                                    <span className="text-4xl font-black text-[#ffaa00] drop-shadow-[0_0_20px_#ffaa00]">+5 MOVES</span>
                                    <PlusCircle className="w-16 h-16 text-[#ffaa00] mt-2" />
                                </motion.div>
                            )}
                            {effect.type === 'shuffle' && (
                                <motion.div 
                                    initial={{ rotate: 0, scale: 0.5, opacity: 0 }}
                                    animate={{ rotate: 360, scale: 1.5, opacity: 1 }}
                                    className="flex items-center justify-center"
                                >
                                    <Shuffle className="w-32 h-32 text-[#00ffff] opacity-20" />
                                </motion.div>
                            )}
                            {effect.type === 'ghost_on' && (
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 4, opacity: [0, 0.5, 0] }}
                                    className="w-20 h-20 border-4 border-[#d400ff] rounded-full blur-md"
                                />
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Ghost Active Overlay */}
                {isGhostActive && (
                    <motion.div 
                        animate={{ opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-gradient-to-br from-[#d400ff]/10 to-transparent pointer-events-none z-30"
                    />
                )}

                {/* Draw Grid Background */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none opacity-[0.05]">
                    {Array.from({length: 36}).map((_, i) => (
                        <div key={i} className="border border-[#00ffff]/30" />
                    ))}
                </div>

                {/* Exit Tunnel Lighting */}
                <div className="absolute top-[33.33%] right-0 w-[4px] h-[16.66%] bg-[#ff2a2a] shadow-[0_0_15px_#ff2a2a] z-20 animate-pulse rounded-l" />

                {/* Blocks Area */}
                <div className="w-full h-full relative z-10">
                    <AnimatePresence mode="popLayout">
                        {!isLoading && cellSize > 0 && blocks.map(block => (
                            <BlockView 
                                key={block.id} 
                                block={block} 
                                blocks={blocks} 
                                isGhostActive={isGhostActive}
                                cellSize={cellSize} 
                                onMove={handleMove} 
                                hasWon={isExiting || hasWon}
                                isHammerActive={activePowerUp === 'hammer'}
                                onHammerUse={handleHammerUse}
                            />
                        ))}
                    </AnimatePresence>
                    {isLoading && (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-[#00ffff]/20 border-t-[#00ffff] rounded-full animate-spin mb-4" />
                            <p className="font-black tracking-widest text-xs text-[#00ffff]">LOADING</p>
                        </div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {hasWon && (
                    <SuccessScreen 
                        levelIndex={levelIndex}
                        moves={moves}
                        minMoves={levelData?.minMoves || 0}
                        onNext={(earnedCoins, earnedStars) => {
                            onComplete(moves, earnedStars, earnedCoins);
                        }}
                        onDoubleReward={() => {
                            // Double reward logic is handled within SuccessScreen state
                        }}
                    />
                )}
            </AnimatePresence>
        </div>

        {/* Global Overlays: Refill & Fail */}
        <AnimatePresence>
            {showRefillModal && refillItem && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-[#02050a]/95 backdrop-blur-xl"
                >
                    <div className="absolute inset-0" onClick={() => !isWatchingAd && setShowRefillModal(false)} />
                    
                    <motion.div 
                        initial={{ scale: 0.85, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 30 }}
                        className="relative w-full max-w-[360px] bg-[#050b14]/90 border border-[#00ffff]/30 rounded-[40px] p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col items-center"
                        style={{
                            clipPath: 'polygon(0% 10%, 10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%)'
                        }}
                    >
                        {/* Immersive Scanlines & Grid */}
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                             style={{ backgroundImage: 'linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        
                        {/* Top Decoration */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#00ffff] to-transparent shadow-[0_0_15px_#00ffff]" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[4px] bg-[#00ffff]/20 blur-md" />

                        {/* Animated HUD Corner */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#00ffff]/20" />
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#00ffff]/20" />

                        <div className="relative flex justify-center mb-8">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-8 border border-dashed border-[#00ffff]/10 rounded-full"
                            />
                            <div className="w-24 h-24 bg-black/60 rounded-[32px] border border-[#00ffff]/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#00ffff]/10 to-transparent rounded-[32px]" />
                                {refillItem.id === 'undo' && <Undo2 className="w-12 h-12 text-[#00ffff]" />}
                                {refillItem.id === 'hammer' && <Hammer className="w-12 h-12 text-[#ff5e5e]" />}
                                {refillItem.id === 'ghost' && <Ghost className="w-12 h-12 text-[#d400ff]" />}
                                {refillItem.id === 'shuffle' && <Shuffle className="w-12 h-12 text-[#00ffff]" />}
                                {refillItem.id === 'moveBoost' && <PlusCircle className="w-12 h-12 text-[#ffaa00]" />}
                                
                                {/* Orbiting Particle */}
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#00ffff] rounded-full shadow-[0_0_10px_#00ffff]" />
                                </motion.div>
                            </div>
                        </div>

                        <div className="text-center mb-10 w-full">
                            <motion.h3 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-2xl font-black text-white tracking-widest uppercase mb-2"
                            >
                                <span className="text-[#00ffff]">REFILL</span> NECESSARY
                            </motion.h3>
                            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mb-4" />
                            <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase leading-relaxed">
                                Deploy additional <span className="text-[#00ffff]">{refillItem.name}</span> unit now
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-5 w-full">
                            {/* Ad Option */}
                            <button 
                                onClick={handleRefillAd}
                                disabled={isWatchingAd}
                                className="group relative w-full h-20 bg-black/40 hover:bg-black/60 border border-[#00ffff]/20 rounded-2xl flex items-center px-6 transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-[#00ffff]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-12 h-12 bg-[#00ffff]/10 rounded-xl flex items-center justify-center mr-5 border border-[#00ffff]/20 group-hover:bg-[#00ffff]/20 transition-all">
                                    <Play className="w-6 h-6 text-[#00ffff] fill-[#00ffff]/20" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-black text-base tracking-tight uppercase leading-none mb-1">Observation</p>
                                    <p className="text-[#00ffff] font-black text-[9px] tracking-widest uppercase">FREE +1 ITEM</p>
                                </div>
                                
                                {isWatchingAd && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center rounded-2xl z-20"
                                    >
                                        <div className="text-[10px] font-black text-[#00ffff] tracking-[0.4em] mb-3 uppercase">SYNCING DATA...</div>
                                        <div className="w-full max-w-[180px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 3, ease: "linear" }}
                                                className="h-full bg-[#00ffff] shadow-[0_0_15px_#00ffff]"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                                <div className="absolute right-6 opacity-20 group-hover:opacity-50 transition-opacity">
                                    <ArrowRight className="w-5 h-5 text-[#00ffff]" />
                                </div>
                            </button>

                            {/* Coin Option */}
                            <button 
                                onClick={handleRefillCoins}
                                disabled={coins < 30 || isWatchingAd}
                                className={`group relative w-full h-20 bg-black/40 hover:bg-black/60 border border-[#ffaa00]/20 rounded-2xl flex items-center px-6 transition-all active:scale-[0.98] ${coins < 30 ? 'opacity-20 grayscale' : ''}`}
                            >
                                <div className="w-12 h-12 bg-[#ffaa00]/10 rounded-xl flex items-center justify-center mr-5 border border-[#ffaa00]/20 group-hover:bg-[#ffaa00]/20 transition-all">
                                    <Coins className="w-6 h-6 text-[#ffaa00]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-black text-base tracking-tight uppercase leading-none mb-1">Buy Rapid</p>
                                    <p className="text-[#ffaa00] font-black text-[9px] tracking-widest uppercase">30 COINS | +3 ITEMS</p>
                                </div>
                                <div className="absolute right-6 opacity-20 group-hover:opacity-50 transition-opacity">
                                    <ArrowRight className="w-5 h-5 text-[#ffaa00]" />
                                </div>
                                {coins < 30 && (
                                    <div className="absolute top-2 right-4">
                                        <span className="text-[7px] font-black text-[#ff5e5e] tracking-[0.2em] uppercase">Low Balance</span>
                                    </div>
                                )}
                            </button>

                            <button 
                                onClick={() => setShowRefillModal(false)}
                                disabled={isWatchingAd}
                                className="mt-4 text-white/20 hover:text-white/40 text-[10px] font-black tracking-[0.5em] uppercase py-2 transition-all active:scale-95 disabled:opacity-0"
                            >
                                RETURN TO MISSION
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {hasFailed && !hasWon && !showRefillModal && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[240] flex flex-col items-center justify-center bg-[#02050a]/95 backdrop-blur-xl px-4"
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,94,94,0.15)_0%,_transparent_70%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.03)_1px,_transparent_1px)] bg-[size:40px_40px] opacity-20" />
                        <motion.div 
                            animate={{ y: ['0%', '100%'] }} 
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} 
                            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ff5e5e]/50 to-transparent shadow-[0_0_15px_#ff5e5e]" 
                        />
                    </div>
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                        className="relative z-10 w-full max-w-[340px] flex flex-col items-center border border-[#ff5e5e]/20 bg-black/60 backdrop-blur-md p-8 pt-10 rounded-3xl shadow-[0_0_50px_rgba(255,94,94,0.1)] overflow-hidden"
                    >
                        {/* Corner Accents */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#ff5e5e]/50 rounded-tl-3xl m-1" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#ff5e5e]/50 rounded-tr-3xl m-1" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#ff5e5e]/50 rounded-bl-3xl m-1" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#ff5e5e]/50 rounded-br-3xl m-1" />
                        
                        <div className="absolute -inset-40 bg-[#ff5e5e]/10 blur-[80px] rounded-full -z-10 animate-pulse pointer-events-none" />
                        
                        <div className="relative w-28 h-28 mb-8 flex flex-col items-center justify-center">
                            <motion.svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#ff5e5e]/20" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                                <polygon points="50,2 98,26 98,74 50,98 2,74 2,26" fill="none" stroke="currentColor" strokeWidth="2" />
                            </motion.svg>
                            <motion.svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full p-2 text-[#ff5e5e]" animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}>
                                <polygon points="50,2 98,26 98,74 50,98 2,74 2,26" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
                            </motion.svg>
                            <div className="w-14 h-14 bg-[#ff5e5e]/10 border-2 border-[#ff5e5e]/40 flex items-center justify-center shadow-[0_0_20px_rgba(255,94,94,0.3)] rotate-45">
                                <Ghost className="w-6 h-6 text-[#ff5e5e] -rotate-45" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center mb-8 w-full">
                            <motion.div 
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-[11px] font-black text-[#ff5e5e] tracking-[0.5em] uppercase mb-3 px-3 py-1 bg-[#ff5e5e]/10 border border-[#ff5e5e]/20 rounded-full"
                            >
                                SYSTEM FAILURE
                            </motion.div>
                            <h2 className="text-4xl font-black text-white mb-2 tracking-tighter text-center uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none">
                                MISSION<br /><span className="text-[#ff5e5e]">FAILED</span>
                            </h2>
                            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#ff5e5e] to-transparent mt-3 mb-6" />
                            
                            <div className="flex flex-col items-center gap-1 bg-[#ff5e5e]/5 border border-[#ff5e5e]/20 py-3 px-6 rounded-lg w-full relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[#ff5e5e]/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="flex items-center gap-2 relative z-10 w-full justify-center">
                                    <Heart className="w-3.5 h-3.5 text-[#ff5e5e]" />
                                    <span className="text-white/60 font-black tracking-widest uppercase text-[10px]">Life Core Status</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm relative z-10 font-mono mt-1 w-full justify-center">
                                    <span className="text-[#ff5e5e] line-through font-bold text-base opacity-50">{lives + 1}</span>
                                    <ArrowRight className="w-3 h-3 text-white/30" />
                                    <span className="text-white font-black text-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{lives}</span>
                                    <span className="text-white/30 ml-1 text-[9px] tracking-[0.2em] uppercase mt-1">Remaining</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={handleRestart} 
                                className="relative py-4 bg-[#ff5e5e]/10 border border-[#ff5e5e]/40 text-[#ff5e5e] hover:bg-[#ff5e5e]/20 font-black rounded-xl active:scale-95 transition-all flex items-center justify-center gap-3 group overflow-hidden shadow-[0_0_20px_rgba(255,94,94,0.2)]"
                            >
                                <div className="absolute inset-0 bg-[#ff5e5e]/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-[-20deg]" />
                                <RotateCcw className="w-5 h-5 relative z-10 transition-transform group-hover:-rotate-180 duration-700" /> 
                                <span className="relative z-10 text-sm tracking-[0.2em]">RETRY DIRECTIVE</span>
                            </button>
                            
                            <button 
                                onClick={onBack}
                                className="py-3 px-4 border border-white/10 hover:border-white/30 text-white/40 hover:text-white/70 bg-white/5 font-black text-[10px] tracking-[0.3em] uppercase rounded-xl transition-all active:scale-95"
                            >
                                RETURN TO BASE
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Power-ups Bar: Optimized for mobile */}
        <div className="w-full flex justify-around items-center bg-[#050b14]/80 border-t border-white/5 py-3 px-2 gap-1 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-tech-grid" />
            
            <PowerUpButton 
                id="hammer" 
                label="SHATTER" 
                icon={Hammer} 
                ringColor="#00ffff" 
                iconColor="#ff5e5e"
                count={powerups.hammer}
                isActive={activePowerUp === 'hammer'}
                onClick={() => usePowerUp('hammer')}
            />
            <PowerUpButton 
                id="moveBoost" 
                label="MOVE +5" 
                icon={PlusCircle} 
                ringColor="#00ffff" 
                iconColor="#ffaa00"
                count={powerups.moveBoost}
                onClick={() => usePowerUp('moveBoost')}
            />
            <PowerUpButton 
                id="shuffle" 
                label="SHUFFLE" 
                icon={Shuffle} 
                ringColor="#ffaa00" 
                iconColor="#00ffff"
                count={powerups.shuffle}
                onClick={() => usePowerUp('shuffle')}
            />
            <PowerUpButton 
                id="ghost" 
                label="GHOST" 
                icon={Ghost} 
                ringColor="#d400ff" 
                iconColor="#d400ff"
                count={powerups.ghost}
                isActive={isGhostActive}
                onClick={() => usePowerUp('ghost')}
            />
        </div>

        {/* Bottom Controls Bar: Explicit height and fixed position at bottom */}
        <div className="w-full h-20 flex justify-center items-center gap-12 bg-[#030712] border-t border-white/10 shrink-0">
            <div className="flex flex-col items-center gap-1">
                <button 
                    onClick={handleUndo}
                    disabled={hasWon || hasFailed || isLoading}
                    className={`relative w-12 h-12 flex items-center justify-center transition-all duration-300 group ${
                        hasWon || hasFailed || isLoading ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-95'
                    } ${history.length === 0 ? 'opacity-40' : ''}`}
                >
                    {/* Ring Visual */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
                        <motion.circle 
                            cx="50%" cy="50%" r="45%" 
                            fill="transparent" 
                            stroke={(powerups.undo || 0) === 0 ? '#ff5e5e' : '#00ffff'} 
                            strokeWidth="2" 
                            strokeDasharray="8 4" 
                            animate={history.length > 0 ? { rotate: 360 } : {}}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            style={{ filter: `drop-shadow(0 0 5px ${(powerups.undo || 0) === 0 ? '#ff5e5e' : '#00ffff'})` }} 
                        />
                    </svg>
                    
                    <div className={`relative z-10 transition-all duration-300 ${history.length > 0 ? 'scale-110' : 'scale-90 opacity-50'}`}>
                        <Undo2 className={`w-5 h-5 transition-colors ${ (powerups.undo || 0) === 0 ? 'text-[#ff5e5e]' : 'text-[#00ffff]'}`} />
                    </div>
                    
                    {/* Badge Count for Undo */}
                    <div className={`absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 text-[9px] font-black rounded-full flex items-center justify-center border z-20 shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
                        (powerups.undo || 0) === 0 ? 'bg-[#ff5e5e] text-white border-white/20 animate-pulse' : 'bg-white text-black border-black/20'
                    }`}>
                        {powerups.undo || 0}
                    </div>
                </button>
                <span className={`text-[9px] font-black tracking-[0.1em] uppercase transition-colors ${(powerups.undo || 0) === 0 ? 'text-[#ff5e5e]' : 'text-[#00ffff]/60'}`}>BACKTRACK</span>
            </div>

            <div className="flex flex-col items-center gap-1">
                <button 
                    onClick={handleRestartClick}
                    disabled={hasWon || isLoading}
                    className={`relative w-12 h-12 flex items-center justify-center transition-all duration-300 group ${
                        hasWon || isLoading ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-90'
                    }`}
                >
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
                        <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="#ffaa00" strokeWidth="2" strokeDasharray="8 4" style={{ filter: 'drop-shadow(0 0 5px #ffaa00)' }} />
                    </svg>
                    <RotateCcw className="w-5 h-5 text-[#ffaa00] relative z-10" />
                </button>
                <span className="text-[9px] font-black text-[#ffaa00]/60 tracking-[0.1em] uppercase">RESET</span>
            </div>
        </div>

        {/* Restart Confirmation Modal */}
        <AnimatePresence>
            {showRestartConfirm && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-[#02050a]/95 backdrop-blur-xl px-4"
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,170,0,0.1)_0%,_transparent_50%)]" />
                    </div>

                    <motion.div 
                        initial={{ scale: 0.9, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-black/80 backdrop-blur-md border border-[#ffaa00]/30 w-full max-w-[340px] flex flex-col shadow-[0_0_60px_rgba(255,170,0,0.15)] relative overflow-hidden rounded-3xl p-8"
                    >
                        {/* Corner Accents */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#ffaa00]/50 rounded-tl-3xl m-1" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#ffaa00]/50 rounded-tr-3xl m-1" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#ffaa00]/50 rounded-bl-3xl m-1" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#ffaa00]/50 rounded-br-3xl m-1" />
                        
                        <div className="absolute -inset-40 bg-[#ffaa00]/10 blur-[80px] rounded-full -z-10 animate-pulse pointer-events-none" />
                        <motion.div 
                            animate={{ y: ['0%', '100%'] }} 
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} 
                            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffaa00]/40 to-transparent shadow-[0_0_10px_#ffaa00] pointer-events-none" 
                        />

                        <div className="flex flex-col items-center relative z-10 w-full mt-2">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="w-20 h-20 rounded-full border border-[#ffaa00]/20 border-t-[#ffaa00] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,170,0,0.2)] bg-[#ffaa00]/5"
                            >
                                <motion.div animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                                    <RotateCcw className="w-8 h-8 text-[#ffaa00]" />
                                </motion.div>
                            </motion.div>
                            
                            <motion.div 
                                animate={{ opacity: [0.6, 1, 0.6] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-[10px] font-black text-[#ffaa00] tracking-[0.6em] uppercase mb-2 px-3 py-1 bg-[#ffaa00]/10 border border-[#ffaa00]/20 rounded-full"
                            >
                                ACTION REQUIRED
                            </motion.div>

                            <h3 className="text-3xl font-black text-center text-white tracking-widest uppercase mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">WARNING</h3>
                            
                            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#ffaa00] to-transparent mt-2 mb-5" />

                            <div className="flex flex-col items-center gap-1 bg-[#ffaa00]/5 border border-[#ffaa00]/20 py-3 px-6 rounded-lg w-full relative overflow-hidden mb-6">
                                <div className="absolute inset-0 bg-[#ff5e5e]/5" />
                                <div className="flex items-center gap-2 mb-1 relative z-10">
                                    <Heart className="w-3.5 h-3.5 text-[#ff5e5e]" />
                                    <span className="text-white/60 font-black tracking-widest uppercase text-[10px]">Life Core Impact</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm relative z-10 font-mono mt-1">
                                    <span className="text-white font-bold text-lg">{lives}</span>
                                    <ArrowRight className="w-3 h-3 text-[#ff5e5e]/60" />
                                    <span className="text-[#ff5e5e] font-black text-xl drop-shadow-[0_0_10px_rgba(255,94,94,0.4)]">{Math.max(0, lives - 1)}</span>
                                </div>
                            </div>
                            
                            <p className="text-center text-white/50 text-[11px] mb-8 leading-relaxed px-2 font-mono tracking-wide">
                                INITIATING LEVEL RESET WILL CONSUME 1 LIFE UNIT. PROCEED?
                            </p>
                            
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => { audio.playTap(); setShowRestartConfirm(false); }}
                                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/40 font-black text-[11px] uppercase tracking-[0.3em] hover:bg-white/5 hover:text-white/70 active:scale-95 transition-all"
                                >
                                    CANCEL
                                </button>
                                <button 
                                    onClick={() => { handleRestart(); }}
                                    className="flex-1 py-3.5 rounded-xl bg-[#ffaa00]/10 border border-[#ffaa00]/40 text-[#ffaa00] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-[#ffaa00]/20 hover:shadow-[0_0_20px_rgba(255,170,0,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 group overflow-hidden relative"
                                >
                                    <div className="absolute inset-0 bg-[#ffaa00]/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-[-20deg]" />
                                    <span className="relative z-10 text-center w-full">CONFIRM</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}

function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simulate loading time
        const duration = 3000;
        const interval = 30; // ms
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            setProgress(Math.min((currentStep / steps) * 100, 100));
            if (currentStep >= steps) {
                clearInterval(timer);
                setTimeout(onComplete, 500); 
            }
        }, interval);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 w-full h-full flex flex-col items-center justify-end z-50 cursor-default overflow-hidden"
        >
             {/* Base Background Color */}
             <div className="absolute inset-0 bg-[#02050a] -z-20" />

             {/* Background Image */}
             <img 
                 src={splashImg} 
                 alt="Splash"
                 loading="eager"
                 className="absolute inset-0 w-full h-full object-cover opacity-100 z-[-1]"
             />
             <div className="absolute inset-0 bg-black/20 pointer-events-none z-0" />
             
             {/* Neon effects behind loading bar but in front of background */}
             <div className="absolute inset-0 flex items-center justify-center -z-10 mix-blend-screen pointer-events-none opacity-30">
                 <div className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] border-[50px] border-[#00ffff]/10 border-dashed rounded-full animate-[spin_40s_linear_infinite]" />
                 <div className="absolute w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] border-[30px] border-[#ffaa00]/10 border-dashed rounded-full animate-[spin_30s_linear_infinite_reverse]" />
             </div>

             {/* Overlay Gradient */}
             <div className="absolute inset-0 bg-gradient-to-t from-[#02050a] via-transparent to-transparent pointer-events-none z-1" />
             
             {/* Loading Bar Area */}
             <div className="w-[80%] max-w-[300px] mb-20 relative z-10 flex flex-col items-center">
                 <p className="text-[#00ffff] font-black tracking-[0.4em] text-sm md:text-base uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] mb-3">
                     LOADING
                 </p>
                 
                 {/* Progress Bar Container */}
                 <div className="w-full h-3 md:h-4 bg-white/5 border border-white/20 rounded-full p-[2px] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] overflow-hidden">
                     {/* Progress Fill */}
                     <motion.div 
                         className="h-full bg-gradient-to-r from-[#00ffff] to-[#5e8eff] rounded-full relative"
                         style={{ width: `${progress}%` }}
                     >
                         {/* Glow effect on the bar */}
                         <div className="absolute inset-0 bg-[#00ffff] blur-[8px] opacity-60" />
                         <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/80" />
                     </motion.div>
                 </div>
                 
                 <p className="text-white/40 font-mono text-[10px] md:text-xs font-bold tracking-widest mt-1 -translate-y-0.5">
                     {Math.floor(progress)}%
                 </p>
             </div>
        </motion.div>
    );
}

function MenuScreen({ coins, lives, onNavigate }: { coins: number, lives: number, onNavigate: (screen: 'game' | 'shop' | 'settings') => void }) {
    return (
        <>
            <img 
                 src={menuBgImg} 
                 alt="Menu Background"
                 className="fixed inset-0 w-full h-full object-cover opacity-100 pointer-events-none z-0"
             />
            <div className="fixed inset-0 bg-black/20 pointer-events-none z-0" /> {/* Readable text overlay */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[320px] flex flex-col items-stretch gap-10 z-10"
            >
             <div className="mb-0 flex flex-col items-center">
                 <motion.img 
                    src={logoImg} 
                    alt="Neon Escape Logo"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-[280px] h-auto drop-shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                 />
             </div>

             <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                <motion.div 
                    className="group flex items-center gap-2 pr-3 pl-1 py-1 bg-black/60 backdrop-blur-md border border-[#ff5e5e]/30 rounded-md shadow-[0_0_20px_rgba(255,94,94,0.15)] relative overflow-hidden"
                    style={{ clipPath: 'polygon(0% 0%, 95% 0%, 100% 30%, 100% 100%, 5% 100%, 0% 70%)' }}
                >
                    <div className="w-6 h-6 rounded bg-[#ff5e5e]/20 flex items-center justify-center border border-[#ff5e5e]/40">
                        <Heart className="w-3.5 h-3.5 text-[#ff5e5e]" />
                    </div>
                    
                    <div className="flex flex-col -gap-1">
                        <span className="text-[7px] font-black text-[#ff5e5e]/60 tracking-[0.2em] uppercase leading-none mb-0.5">Lives</span>
                        <span className="text-sm font-black text-white font-mono tracking-tighter leading-none">{lives}/5</span>
                    </div>
                </motion.div>

                <motion.div 
                    layoutId="global-coin-counter"
                    className="group flex items-center gap-2 pr-3 pl-1 py-1 bg-black/60 backdrop-blur-md border border-[#ffaa00]/30 rounded-md shadow-[0_0_20px_rgba(255,170,0,0.15)] relative overflow-hidden"
                    style={{ clipPath: 'polygon(0% 0%, 95% 0%, 100% 30%, 100% 100%, 5% 100%, 0% 70%)' }}
                >
                    {/* Animated scanning line */}
                    <motion.div 
                        animate={{ x: [-100, 200] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#ffaa00]/10 to-transparent skew-x-[-20deg] pointer-events-none"
                    />
                    
                    <div className="w-6 h-6 rounded bg-[#ffaa00]/20 flex items-center justify-center border border-[#ffaa00]/40">
                        <Coins className="w-3.5 h-3.5 text-[#ffaa00] animate-pulse" />
                    </div>
                    
                    <div className="flex flex-col -gap-1">
                        <span className="text-[7px] font-black text-[#ffaa00]/60 tracking-[0.2em] uppercase leading-none mb-0.5">Credits</span>
                        <span className="text-sm font-black text-white font-mono tracking-tighter leading-none">{coins}</span>
                    </div>
                </motion.div>
             </div>

             <div className="flex flex-col gap-3 w-[250px] mx-auto pt-[80px]">
                 
                 <button 
                     onClick={() => onNavigate('game')}
                     className="relative group w-full py-2.5 bg-[#000a14]/80 backdrop-blur-md border-[2px] border-[#00ccff] rounded-xl shadow-[0_0_15px_rgba(0,204,255,0.3),inset_0_0_10px_rgba(0,204,255,0.2)] hover:bg-[#00ccff]/10 text-[#00ccff] transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,204,255,0.5),inset_0_0_15px_rgba(0,204,255,0.4)] active:scale-[0.98] overflow-hidden"
                 >
                     <div className="absolute inset-[2px] border border-white/20 rounded-lg pointer-events-none" />
                     <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-lg" />
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ccff]/20 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]" />
                     
                     <div className="relative flex flex-col items-center justify-center gap-0.5">
                         <span className="flex items-center justify-center gap-2 text-xl font-black tracking-[0.2em] drop-shadow-[0_0_8px_rgba(0,204,255,0.8)] uppercase">
                             PLAY NOW <Play className="w-4 h-4 drop-shadow-[0_0_6px_rgba(0,204,255,0.8)]" fill="currentColor" />
                         </span>
                         <span className="text-[7.5px] font-bold tracking-[0.3em] text-white/60 uppercase">Start the challenge</span>
                     </div>
                 </button>
                 
                 <button 
                     onClick={() => onNavigate('shop')}
                     className="relative group w-full py-2.5 bg-[#000a14]/80 backdrop-blur-md border-[2px] border-[#00ccff] rounded-xl shadow-[0_0_15px_rgba(0,204,255,0.3),inset_0_0_10px_rgba(0,204,255,0.2)] hover:bg-[#00ccff]/10 text-[#00ccff] transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,204,255,0.5),inset_0_0_15px_rgba(0,204,255,0.4)] active:scale-[0.98] overflow-hidden"
                 >
                     <div className="absolute inset-[2px] border border-white/20 rounded-lg pointer-events-none" />
                     <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-lg" />
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ccff]/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700" />
                     
                     <div className="relative flex flex-col items-center justify-center gap-0.5">
                         <span className="flex items-center justify-center gap-2 text-xl font-black tracking-[0.2em] drop-shadow-[0_0_8px_rgba(0,204,255,0.8)] uppercase">
                             SHOP NOW <ShoppingCart className="w-4 h-4 drop-shadow-[0_0_6px_rgba(0,204,255,0.8)]" />
                         </span>
                         <span className="text-[7.5px] font-bold tracking-[0.3em] text-white/60 uppercase">Upgrade your gear</span>
                     </div>
                 </button>
                 
                 <button 
                     onClick={() => onNavigate('settings')}
                     className="relative group w-full py-2.5 bg-[#000a14]/80 backdrop-blur-md border-[2px] border-[#00ccff] rounded-xl shadow-[0_0_15px_rgba(0,204,255,0.3),inset_0_0_10px_rgba(0,204,255,0.2)] hover:bg-[#00ccff]/10 text-[#00ccff] transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,204,255,0.5),inset_0_0_15px_rgba(0,204,255,0.4)] active:scale-[0.98] overflow-hidden"
                 >
                     <div className="absolute inset-[2px] border border-white/20 rounded-lg pointer-events-none" />
                     <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-lg" />
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ccff]/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700" />
                     
                     <div className="relative flex flex-col items-center justify-center gap-0.5">
                         <span className="flex items-center justify-center gap-2 text-xl font-black tracking-[0.2em] drop-shadow-[0_0_8px_rgba(0,204,255,0.8)] uppercase">
                             SETTINGS <Settings className="w-4 h-4 drop-shadow-[0_0_6px_rgba(0,204,255,0.8)]" />
                         </span>
                         <span className="text-[7.5px] font-bold tracking-[0.3em] text-white/60 uppercase">Game configuration</span>
                     </div>
                 </button>
             </div>
        </motion.div>
        </>
    );
}

function PlaceholderScreen({ title, color, onBack }: { title: string, color: string, onBack: () => void }) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm flex flex-col items-center z-20"
        >
             <div className="w-full flex items-center mb-12">
                 <button 
                    onClick={() => { audio.playTap(); onBack(); }}
                    className={`w-14 h-14 shrink-0 rounded-xl border border-white/20 bg-[#0a0f1a] flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.05)]`}
                    style={{ 
                        borderColor: `rgba(255,255,255,0.2)`, 
                        color: color 
                    }}
                 >
                    <span className="text-4xl font-bold leading-none pb-[2px] pr-[2px]" style={{ textShadow: `0 0 10px ${color}80` }}>‹</span>
                 </button>
                 <h1 className="flex-1 text-center text-3xl font-black tracking-[0.3em] pr-14 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] uppercase" style={{ color: color }}>{title}</h1>
             </div>
             
             <div className="w-full aspect-video rounded-2xl border-2 border-dashed flex items-center justify-center bg-[#0a0f1a]/80 shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ borderColor: `${color}40` }}>
                  <p className="font-black tracking-[0.4em] text-xl opacity-80" style={{ color: color, textShadow: `0 0 15px ${color}` }}>COMING SOON</p>
             </div>
        </motion.div>
    );
}

function LevelsScreen({ unlockedLevel, coins, lives, levelStars, onSelectLevel, onBack }: { unlockedLevel: number, coins: number, lives: number, levelStars: Record<number, number>, onSelectLevel: (lvl: number) => void, onBack: () => void }) {
    const displayCount = Math.max(24, Math.ceil((unlockedLevel + 10) / 4) * 4);
    
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 w-full h-full flex flex-col items-center z-20 pt-[60px] pb-8 px-4"
        >
             {/* Back Button Overlay */}
             <div className="absolute top-6 left-6 z-30">
                 <button 
                    onClick={() => { audio.playTap(); onBack(); }}
                    className="w-11 h-11 shrink-0 rounded-xl bg-[#030712]/80 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/10 hover:border-[#00ffff] hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] flex items-center justify-center transition-all active:scale-95"
                 >
                    <span className="text-2xl font-bold leading-none pb-[2px] pr-[2px]">‹</span>
                 </button>
             </div>

             <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
                <motion.div 
                    className="group flex items-center gap-2 pr-3 pl-1 py-1 bg-black/60 backdrop-blur-md border border-[#ff5e5e]/30 rounded-md shadow-[0_0_20px_rgba(255,94,94,0.15)] relative overflow-hidden"
                    style={{ clipPath: 'polygon(0% 0%, 95% 0%, 100% 30%, 100% 100%, 5% 100%, 0% 70%)' }}
                >
                    <div className="w-6 h-6 rounded bg-[#ff5e5e]/20 flex items-center justify-center border border-[#ff5e5e]/40">
                        <Heart className="w-3.5 h-3.5 text-[#ff5e5e]" />
                    </div>
                    
                    <div className="flex flex-col -gap-1">
                        <span className="text-[7px] font-black text-[#ff5e5e]/60 tracking-[0.2em] uppercase leading-none mb-0.5">Lives</span>
                        <span className="text-sm font-black text-white font-mono tracking-tighter leading-none">{lives}/5</span>
                    </div>
                </motion.div>

                <motion.div 
                    layoutId="global-coin-counter"
                    className="group flex items-center gap-2 pr-3 pl-1 py-1 bg-black/60 backdrop-blur-md border border-[#ffaa00]/30 rounded-md shadow-[0_0_20px_rgba(255,170,0,0.15)] relative overflow-hidden"
                    style={{ clipPath: 'polygon(0% 0%, 95% 0%, 100% 30%, 100% 100%, 5% 100%, 0% 70%)' }}
                >
                    <motion.div 
                        animate={{ x: [-100, 200] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#ffaa00]/10 to-transparent skew-x-[-20deg] pointer-events-none"
                    />
                    
                    <div className="w-6 h-6 rounded bg-[#ffaa00]/20 flex items-center justify-center border border-[#ffaa00]/40">
                        <Coins className="w-3.5 h-3.5 text-[#ffaa00] animate-pulse" />
                    </div>
                    
                    <div className="flex flex-col -gap-1">
                        <span className="text-[7px] font-black text-[#ffaa00]/60 tracking-[0.2em] uppercase leading-none mb-0.5">Credits</span>
                        <span className="text-sm font-black text-white font-mono tracking-tighter leading-none">{coins}</span>
                    </div>
                </motion.div>
             </div>

             {/* Main Container mirroring the image */}
             <div className="relative w-full max-w-[360px] flex-1 flex flex-col items-center min-h-0">
                  
                  {/* Background ambient glow */}
                  <div className="absolute inset-0 bg-[#00ffff]/10 blur-[50px] rounded-full pointer-events-none" />

                  {/* Spacer for top padding */}
                  <div className="h-6" />

                  <div className="relative w-[80%] h-[70px] mb-[4px] bg-[#010b14]/90 shadow-[0_0_20px_rgba(0,255,255,0.3),inset_0_0_15px_rgba(0,255,255,0.2)] border-t border-l border-r border-[#00ffff]/60 flex justify-center items-center backdrop-blur-sm z-10 shrink-0"
                       style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%)' }}>
                       
                       {/* Inner border line */}
                       <div className="absolute inset-[2px] bg-[#021020]"
                            style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%)' }} />
                            
                       <h1 className="relative text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] to-[#38baff] tracking-[0.1em] uppercase z-20 px-4"
                           style={{ WebkitTextStroke: '1.5px rgba(0,200,255,0.8)', textShadow: '0 0 15px rgba(0,255,255,0.8)' }}>
                           LEVELS
                       </h1>
                  </div>

                  {/* Main Container Frame */}
                  <div className="relative w-full flex-1 bg-[#010b14]/80 backdrop-blur-sm border border-[#00ffff]/40 shadow-[0_0_30px_rgba(0,255,255,0.2),inset_0_0_30px_rgba(0,255,255,0.2)] p-1 z-0 flex flex-col min-h-0"
                       style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 25%, 95% 30%, 95% 70%, 100% 75%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 75%, 5% 70%, 5% 30%, 0% 25%)' }}>
                       
                       {/* Inner padding block for grid */}
                       <div className="w-full flex-1 min-h-0 bg-[#00050a] flex flex-col relative overflow-hidden"
                            style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 25%, 95% 30%, 95% 70%, 100% 75%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 75%, 5% 70%, 5% 30%, 0% 25%)' }}>
                            
                            {/* Grid Graphic */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.15)_1px,transparent_1px)] bg-[size:100%_calc(100%/6)] opacity-70 pointer-events-none" />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,255,255,0.15)_1px,transparent_1px)] bg-[size:25%_100%] opacity-70 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#00ffff]/30 via-[#00050a]/50 to-[#00050a] pointer-events-none" />

                            <div className="relative z-10 flex-1 overflow-y-auto px-5 py-6 no-scrollbar pb-10">
                                <div className="grid grid-cols-4 gap-3">
                                    {Array.from({length: displayCount}).map((_, i) => {
                                        const isUnlocked = i <= unlockedLevel;
                                        const isCurrent = i === unlockedLevel;
                                        const starsEarned = levelStars[i] || 0;
                                        return (
                                            <button
                                                key={i}
                                                disabled={!isUnlocked}
                                                onClick={() => {
                                                    if (isUnlocked) {
                                                        audio.playTap();
                                                        onSelectLevel(i);
                                                    }
                                                }}
                                                className={`aspect-[1/1.05] rounded-[8px] flex flex-col items-center justify-center relative transition-all group overflow-hidden border-[2px] p-1 
                                                    ${isUnlocked 
                                                        ? isCurrent 
                                                            ? 'bg-[#00ffff]/5 border-[#00ff88] text-white shadow-[0_0_15px_rgba(0,255,136,0.2),inset_0_0_10px_rgba(0,255,136,0.15)] hover:bg-[#00ff88]/20'
                                                            : 'bg-[#010b14]/50 border-[#00cccc] text-white hover:bg-[#00ffff]/20 hover:border-[#00ffff] hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]'
                                                        : 'bg-[#010b14]/30 border-[#00cccc]/40 text-[#00cccc]/40 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isCurrent && (
                                                    <div className="absolute top-1.5 w-1.5 h-1.5 border-[1.5px] border-[#00ff88] rounded-full drop-shadow-[0_0_5px_rgba(0,255,136,1)]" />
                                                )}
                                                
                                                {isUnlocked ? (
                                                    <span className={`text-2xl font-black ${isCurrent ? 'mt-2' : ''} mb-1 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]`}>{i + 1}</span>
                                                ) : (
                                                    <Lock className="w-5 h-5 stroke-[2] opacity-60" />
                                                )}

                                                {/* Stars line */}
                                                {isUnlocked && i < unlockedLevel && (
                                                    <div className="absolute bottom-1 w-full flex justify-center gap-[2px]">
                                                        {[...Array(3)].map((_, starIdx) => (
                                                            <Star key={starIdx} className={`w-2.5 h-2.5 ${starIdx < starsEarned ? 'fill-[#00ffff] text-[#00ffff]' : 'fill-transparent text-[#00ffff]/30 stroke-[2px]'}`} />
                                                        ))}
                                                    </div>
                                                )}
                                                {isCurrent && (
                                                    <div className="absolute bottom-1 w-full flex justify-center gap-[2px] opacity-40">
                                                        <Star className="w-2.5 h-2.5 fill-transparent text-[#00ffff]/30 stroke-[2px]" />
                                                        <Star className="w-2.5 h-2.5 fill-transparent text-[#00ffff]/30 stroke-[2px]" />
                                                        <Star className="w-2.5 h-2.5 fill-transparent text-[#00ffff]/30 stroke-[2px]" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                       </div>
                       
                       {/* Cyan trim accents */}
                       {/* Top */}
                       <div className="absolute top-0 left-0 w-[20%] h-[3px] bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,1)]" />
                       <div className="absolute top-0 right-0 w-[20%] h-[3px] bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,1)]" />
                       
                       {/* Side indent marks */}
                       <div className="absolute top-[32%] left-[4px] w-[3px] h-[36%] bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,1)] opacity-70" />
                       <div className="absolute top-[32%] right-[4px] w-[3px] h-[36%] bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,1)] opacity-70" />

                       {/* Bottom corner vertical tabs */}
                       <div className="absolute bottom-[10%] left-[2px] w-[6px] h-[12%] bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,1)] rounded-sm" />
                       <div className="absolute bottom-[10%] right-[2px] w-[6px] h-[12%] bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,1)] rounded-sm" />
                       
                       {/* Bottom line */}
                       <div className="absolute bottom-0 left-[15%] w-[70%] h-[3px] bg-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,1)]" />
                  </div>
             </div>
        </motion.div>
    );
}

function ShopScreen({ coins, lives, setCoins, setLives, powerups, setPowerups, onBack }: { coins: number, lives: number, setCoins: (c: number) => void, setLives: React.Dispatch<React.SetStateAction<number>>, powerups: PowerUpInventory, setPowerups: (p: PowerUpInventory) => void, onBack: () => void }) {
    const POWERUP_COST = 30;
    const [isWatchingAd, setIsWatchingAd] = useState(false);

    const items = [
        { id: 'hammer', name: 'SHATTER', icon: Hammer, desc: 'Blasts a block out of existence', color: '#00ffff' },
        { id: 'moveBoost', name: 'MOVE BOOST', icon: PlusCircle, desc: '+5 Extra moves to finish level', color: '#ffaa00' },
        { id: 'shuffle', name: 'SHUFFLE', icon: Shuffle, desc: 'Shuffle compatible blocks', color: '#ffaa00' },
        { id: 'ghost', name: 'GHOST', icon: Ghost, desc: 'Pass through one obstacle', color: '#d400ff' },
        { id: 'undo', name: 'BACKTRACK', icon: Undo2, desc: 'Revert your last move', color: '#00ffff' },
    ];

    const buyItem = (id: PowerUpType) => {
        if (coins >= POWERUP_COST) {
            audio.playCollect();
            const newCoins = coins - POWERUP_COST;
            const newPowerups = { ...powerups, [id]: powerups[id] + 1 };
            setCoins(newCoins);
            setPowerups(newPowerups);
            
            const saved = JSON.parse(localStorage.getItem('neon_slide_progress') || '{}');
            localStorage.setItem('neon_slide_progress', JSON.stringify({
                ...saved,
                coins: newCoins,
                powerups: newPowerups
            }));
        } else {
            audio.playError();
        }
    };

    const buyLife = () => {
        if (lives >= 5) {
            audio.playError();
            return;
        }
        if (coins >= 20) {
            audio.playCollect();
            setCoins(coins - 20);
            setLives((l) => Math.min(5, l + 1));
            
            const saved = JSON.parse(localStorage.getItem('neon_slide_progress') || '{}');
            localStorage.setItem('neon_slide_progress', JSON.stringify({
                ...saved,
                coins: coins - 20,
                lives: Math.min(5, lives + 1)
            }));
        } else {
            audio.playError();
        }
    };

    const handleWatchAd = async () => {
        if (lives >= 5) {
            audio.playError();
            return;
        }
        setIsWatchingAd(true);
        audio.playTap();
        
        if (Capacitor.isNativePlatform()) {
            try {
                // Show rewarded video
                await AdMob.showRewardVideoAd();
                
                audio.playWin();
                setLives((l) => Math.min(5, l + 1));
                
                const saved = JSON.parse(localStorage.getItem('neon_slide_progress') || '{}');
                localStorage.setItem('neon_slide_progress', JSON.stringify({
                    ...saved,
                    lives: Math.min(5, lives + 1)
                }));
                
                // Prepare next ad
                await AdMob.prepareRewardVideoAd({
                    adId: 'ca-app-pub-3940256099942544/5224354917',
                });
            } catch(e) {
                console.error('AdMob Error', e);
            } finally {
                setIsWatchingAd(false);
            }
        } else {
            setTimeout(() => {
                audio.playWin();
                setLives((l) => Math.min(5, l + 1));
                setIsWatchingAd(false);
                
                const saved = JSON.parse(localStorage.getItem('neon_slide_progress') || '{}');
                localStorage.setItem('neon_slide_progress', JSON.stringify({
                    ...saved,
                    lives: Math.min(5, lives + 1)
                }));
            }, 3000);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 w-full h-full flex flex-col z-20 bg-[#02050a]"
        >
            {isWatchingAd && (
                 <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                     <Video className="w-16 h-16 text-[#00ffff] mb-4 animate-pulse" />
                     <p className="text-xl font-black text-[#00ffff] tracking-widest uppercase">Viewing Transmission</p>
                     <p className="text-white/50 text-sm mt-2 font-mono">Restoring life source...</p>
                 </div>
            )}

            {/* Tech Backdrop */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <img 
                    src={shopBgImg} 
                    alt="Shop Background"
                    className="w-full h-full object-cover opacity-60 brightness-90 scale-110 blur-[1px] z-0" 
                />
                <div className="absolute inset-0 bg-black/30 pointer-events-none z-[1]" />
            </div>

            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <svg width="100%" height="100%" className="text-[#00ffff]">
                    <pattern id="shop-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#shop-grid)" />
                </svg>
            </div>

             {/* Header */}
             <div className="relative w-full p-4 px-6 flex justify-between items-center bg-[#050b14]/95 border-b border-[#00ffff]/20 z-20">
                 <button 
                     onClick={() => { audio.playTap(); onBack(); }}
                     className="group relative w-10 h-10 flex items-center justify-center overflow-hidden transition-all active:scale-95"
                 >
                     <div className="absolute inset-0 bg-[#00ffff]/5 border border-[#00ffff]/30 skew-x-[-12deg]" />
                     <ArrowLeft className="w-5 h-5 text-[#00ffff] relative z-10 transition-transform group-hover:-translate-x-1" />
                 </button>
                 
                 <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
                    <img src={logoImg} alt="Neon Shop" className="w-20 h-auto drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] mb-0.5" />
                    <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-[#00ffff] to-transparent py-0" />
                    <span className="text-[7.5px] font-black text-[#00ffff]/40 tracking-[0.4em] uppercase">Tactical Arsenal</span>
                 </div>

                 <div className="flex gap-2">
                     <div className="group flex items-center gap-1.5 pr-2 pl-1 py-1 bg-black/60 backdrop-blur-md border border-[#ff5e5e]/30 rounded-md shadow-[0_0_20px_rgba(255,94,94,0.15)] relative overflow-hidden" 
                        style={{ clipPath: 'polygon(0% 0%, 95% 0%, 100% 30%, 100% 100%, 5% 100%, 0% 70%)' }}>
                        <div className="w-5 h-5 rounded bg-[#ff5e5e]/20 flex items-center justify-center border border-[#ff5e5e]/40">
                            <Heart className="w-3 h-3 text-[#ff5e5e]" />
                        </div>
                        <span className="text-xs font-black text-white font-mono tracking-tighter leading-none">{lives}/5</span>
                     </div>
                     <motion.div 
                        layoutId="global-coin-counter"
                        className="group flex items-center gap-1.5 pr-2 pl-1 py-1 bg-black/60 backdrop-blur-md border border-[#ffaa00]/30 rounded-md shadow-[0_0_20px_rgba(255,170,0,0.15)] relative overflow-hidden"
                        style={{ clipPath: 'polygon(0% 0%, 95% 0%, 100% 30%, 100% 100%, 5% 100%, 0% 70%)' }}
                     >
                        <div className="w-5 h-5 rounded bg-[#ffaa00]/20 flex items-center justify-center border border-[#ffaa00]/40">
                            <Coins className="w-3 h-3 text-[#ffaa00] animate-pulse" />
                        </div>
                        <span className="text-xs font-black text-white font-mono tracking-tighter leading-none">{coins}</span>
                     </motion.div>
                 </div>
             </div>

             {/* Items Container */}
             <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-4 no-scrollbar z-10 w-full max-w-[500px] mx-auto">
                 
                 {/* Lives Section */}
                 <div className="flex flex-col gap-4 mb-6 relative w-full">
                     <div className="absolute inset-0 bg-[#ff5e5e]/5 blur-xl -z-10 rounded-full" />
                     <div className="flex items-center gap-3">
                         <Heart className="w-5 h-5 text-[#ff5e5e]" />
                         <h3 className="text-[#ff5e5e] font-black tracking-widest uppercase text-sm">Life Support</h3>
                         <div className="h-[1px] flex-1 bg-gradient-to-r from-[#ff5e5e]/50 to-transparent" />
                     </div>
                     
                     <div className="flex flex-col gap-3">
                         <div className="bg-[#050b14]/80 p-4 border border-[#ff5e5e]/20 hover:border-[#ff5e5e]/50 transition-colors flex justify-between items-center relative overflow-hidden group">
                             <div className="absolute inset-0 bg-[#ff5e5e]/5 group-hover:bg-[#ff5e5e]/10 transition-colors" />
                             <div className="flex items-center gap-3 relative z-10">
                                 <div className="w-10 h-10 rounded-lg bg-black/60 border border-[#ff5e5e]/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,94,94,0.3)]">
                                     <Heart className="w-5 h-5 text-[#ff5e5e]" />
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="font-black text-white tracking-widest text-sm">+1 LIFE</span>
                                     <span className="text-[10px] text-white/50 tracking-wider">Purchase Life</span>
                                 </div>
                             </div>
                             
                             <button 
                                 onClick={buyLife}
                                 disabled={lives >= 5 || coins < 20}
                                 className={`relative z-10 px-4 py-2 border rounded font-black text-xs tracking-widest flex items-center gap-2 active:scale-95 transition-all
                                     ${lives >= 5 || coins < 20 
                                         ? 'border-white/10 text-white/30 bg-black/40' 
                                         : 'border-[#ffaa00] text-[#ffaa00] bg-[#ffaa00]/10 hover:bg-[#ffaa00]/20 hover:shadow-[0_0_15px_rgba(255,170,0,0.3)]'}`}
                             >
                                 {lives >= 5 ? 'FULL' : (
                                     <>
                                         <span>20</span>
                                         <Coins className="w-3 h-3" />
                                     </>
                                 )}
                             </button>
                         </div>

                         <div className="bg-[#050b14]/80 p-4 border border-[#00ffff]/20 hover:border-[#00ffff]/50 transition-colors flex justify-between items-center relative overflow-hidden group">
                             <div className="absolute inset-0 bg-[#00ffff]/5 group-hover:bg-[#00ffff]/10 transition-colors" />
                             <div className="flex items-center gap-3 relative z-10">
                                 <div className="w-10 h-10 rounded-lg bg-black/60 border border-[#00ffff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                                     <Video className="w-5 h-5 text-[#00ffff]" />
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="font-black text-white tracking-widest text-sm">+1 LIFE</span>
                                     <span className="text-[10px] text-white/50 tracking-wider">View Transmission</span>
                                 </div>
                             </div>
                             
                             <button 
                                 onClick={handleWatchAd}
                                 disabled={lives >= 5}
                                 className={`relative z-10 px-4 py-2 border rounded font-black text-xs tracking-widest flex items-center gap-2 active:scale-95 transition-all
                                     ${lives >= 5 
                                         ? 'border-white/10 text-white/30 bg-black/40' 
                                         : 'border-[#00ffff] text-[#00ffff] bg-[#00ffff]/10 hover:bg-[#00ffff]/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]'}`}
                             >
                                 {lives >= 5 ? 'FULL' : 'WATCH'}
                             </button>
                         </div>
                     </div>
                 </div>

                 <div className="flex items-center gap-3 mb-2">
                     <ShoppingCart className="w-5 h-5 text-[#00ffff]" />
                     <h3 className="text-[#00ffff] font-black tracking-widest uppercase text-sm">Power-Ups</h3>
                     <div className="h-[1px] flex-1 bg-gradient-to-r from-[#00ffff]/50 to-transparent" />
                 </div>

                 {items.map((item, idx) => (
                     <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        key={item.id}
                        className="relative group p-5 bg-[#050c18]/60 border border-white/5 hover:border-[#00ffff]/30 transition-all duration-500 flex items-center gap-5 overflow-hidden"
                        style={{
                            clipPath: 'polygon(0% 0%, 95% 0%, 100% 15%, 100% 100%, 5% 100%, 0% 85%)'
                        }}
                     >
                         {/* Item Background Glow */}
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ffff]/[0.03] to-transparent -translate-x-[150%] group-hover:animate-[shimmer_3s_infinite]" />
                         
                         {/* Icon Box */}
                         <div className="w-16 h-16 flex items-center justify-center relative shrink-0">
                            <div className="absolute inset-0 bg-white/[0.03] rotate-45 scale-90 group-hover:bg-[#00ffff]/5 transition-colors" />
                            <div className="absolute inset-0 border border-white/10 rotate-45 scale-95 group-hover:border-[#00ffff]/20 transition-all" />
                            
                             <item.icon className="w-8 h-8 relative z-10" style={{ color: item.color, filter: `drop-shadow(0 0 8px ${item.color})` }} />
                             
                             <div className="absolute -top-1 -right-1 bg-white text-black text-[11px] font-black px-2 py-0.5 rounded-full z-20 shadow-lg scale-90 md:scale-100">
                                 {powerups[item.id as PowerUpType]}
                             </div>
                         </div>

                         {/* Details */}
                         <div className="flex-1 relative">
                             <h3 className="text-lg font-black tracking-widest text-[#00ffff] leading-none mb-1 group-hover:translate-x-1 transition-transform">{item.name}</h3>
                             <p className="text-[10px] md:text-xs text-white/40 font-black tracking-wider uppercase leading-tight md:max-w-[180px]">{item.desc}</p>
                         </div>

                         {/* Buy Button */}
                         <button 
                            onClick={() => buyItem(item.id as PowerUpType)}
                            disabled={coins < POWERUP_COST}
                            className={`relative w-20 h-14 md:w-24 md:h-16 flex items-center justify-center overflow-hidden transition-all active:scale-90 ${
                                coins >= POWERUP_COST 
                                ? 'group/btn' 
                                : 'opacity-40 grayscale cursor-not-allowed'
                            }`}
                         >
                            <div className={`absolute inset-0 transform skew-x-[-12deg] transition-all ${
                                coins >= POWERUP_COST 
                                ? 'bg-gradient-to-br from-[#00ffff]/20 to-[#0088ff]/10 border border-[#00ffff]/40 group-hover/btn:from-[#00ffff]/40 group-hover/btn:to-[#0088ff]/20' 
                                : 'bg-white/5 border border-white/10'
                            }`} />
                            <div className="relative flex flex-col items-center gap-0.5">
                                <span className={`text-[10px] font-black tracking-[0.2em] ${coins >= POWERUP_COST ? 'text-[#00ffff]' : 'text-white/20'}`}>BUY</span>
                                <div className="flex items-center gap-1">
                                    <Coins className={`w-3.5 h-3.5 ${coins >= POWERUP_COST ? 'text-[#ffaa00]' : 'text-white/20'}`} />
                                    <span className={`text-sm font-black font-mono ${coins >= POWERUP_COST ? 'text-white' : 'text-white/20'}`}>{POWERUP_COST}</span>
                                </div>
                            </div>
                         </button>
                     </motion.div>
                 ))}
             </div>

             {/* Footer Info */}
             <div className="relative p-6 bg-[#030914]/90 border-t border-[#00ffff]/10 text-center z-10">
                 <p className="text-[10px] text-white/20 font-black tracking-[0.4em] uppercase">Unlock performance enhancements with credits</p>
                 <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#00ffff]/30 to-transparent" />
             </div>
        </motion.div>
    );
}

function SettingsScreen({ onBack }: { onBack: () => void }) {
    const [vol, setVol] = useState(audio.globalVolume);
    const [showPolicy, setShowPolicy] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVol(val);
        audio.setVolume(val);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-[#02050a] z-50 p-6"
        >
             {/* Cyber Backdrop */}
             <div className="absolute inset-0 opacity-[0.05] pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -left-[20%] w-[60%] h-[60%] bg-[#00ffff]/10 blur-[80px] rounded-full" />
                <div className="absolute -bottom-[20%] -right-[20%] w-[60%] h-[60%] bg-[#ffaa00]/10 blur-[80px] rounded-full" />
             </div>

             <motion.div 
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                className="relative w-full max-w-sm bg-[#050b14]/90 border border-[#00ffff]/30 rounded-[40px] p-8 shadow-2xl flex flex-col items-center"
                style={{
                    clipPath: 'polygon(12% 0%, 88% 0%, 100% 8%, 100% 92%, 88% 100%, 12% 100%, 0% 92%, 0% 8%)'
                }}
             >
                {/* Tech Accents */}
                <div className="absolute top-0 left-1/4 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#00ffff] to-transparent shadow-[0_0_15px_#00ffff]" />
                <div className="absolute bottom-0 left-1/4 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#00ffff] to-transparent shadow-[0_0_15px_#00ffff]" />

                 <div className="flex flex-col items-center mb-10">
                    <img src={logoImg} alt="Logo" className="w-32 h-auto drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]" />
                    <p className="text-[10px] text-[#00ffff]/40 font-black tracking-[0.4em] uppercase mt-2">SYSTEM CONFIGURATION</p>
                </div>

                 <div className="w-full flex flex-col gap-10">
                     
                     {/* Volume Control */}
                     <div className="flex flex-col gap-6">
                         <div className="flex justify-between items-end">
                             <div className="flex flex-col">
                                <span className="text-[#00ffff]/60 text-[10px] font-black tracking-[0.4em] uppercase mb-1">Audio Output</span>
                                <span className="font-black tracking-widest text-lg text-white">MASTER VOLUME</span>
                             </div>
                             <span className="font-black text-2xl text-[#00ffff] font-mono drop-shadow-[0_0_5px_#00ffff]">
                                 {Math.round(vol * 50)}%
                             </span>
                         </div>
                         
                         <div className="relative h-12 flex items-center">
                            <div className="absolute inset-x-0 h-1.5 bg-white/5 rounded-full" />
                            <div className="absolute left-0 h-1.5 bg-[#00ffff] rounded-full shadow-[0_0_10px_#00ffff]" style={{ width: `${(vol / 2) * 100}%` }} />
                            <input 
                                type="range" 
                                min="0" max="2" step="0.05"
                                value={vol}
                                onChange={handleVolumeChange}
                                className="absolute inset-x-0 h-full opacity-0 cursor-pointer z-10"
                            />
                            {/* Visual Slider Thumb */}
                            <div 
                                className="absolute w-6 h-6 bg-white border-2 border-[#00ffff] rounded-full shadow-[0_0_15px_#00ffff] pointer-events-none -translate-x-1/2"
                                style={{ left: `${(vol / 2) * 100}%` }}
                            />
                         </div>
                     </div>

                     {/* Pseudo Settings */}
                     <div className="flex flex-col gap-4">
                        {[
                            { label: 'Haptic Feedback', active: true },
                            { label: 'Glitch Effects', active: true },
                            { label: 'Cloud Sync', active: false },
                        ].map((s, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <span className="font-black tracking-widest text-sm text-white/60 uppercase">{s.label}</span>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${s.active ? 'bg-[#00ffff]/30' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 rounded-full shadow-lg transform transition-transform ${s.active ? 'translate-x-6 bg-[#00ffff]' : 'bg-white/20'}`} />
                                </div>
                            </div>
                        ))}
                     </div>

                     <div className="flex gap-4 justify-center mt-2">
                        <button 
                            onClick={() => { audio.playTap(); setShowPolicy(true); }}
                            className="text-[10px] text-white/40 hover:text-white/80 font-black tracking-widest uppercase transition-colors"
                        >
                            Privacy Policy
                        </button>
                        <span className="text-white/20">•</span>
                        <button 
                            onClick={() => { audio.playTap(); setShowTerms(true); }}
                            className="text-[10px] text-white/40 hover:text-white/80 font-black tracking-widest uppercase transition-colors"
                        >
                            Terms of Service
                        </button>
                     </div>
                 </div>

                 <button 
                    onClick={() => { audio.playTap(); onBack(); }}
                    className="mt-12 group relative w-full h-14 overflow-hidden active:scale-95 transition-all"
                 >
                    <div className="absolute inset-0 bg-[#00ffff] transform skew-x-[-12deg]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-black font-black tracking-[0.3em] uppercase text-sm">EXIT SETUP</span>
                    </div>
                </button>

                <p className="mt-8 text-white/20 text-[9px] font-black tracking-[0.3em] uppercase text-center w-full absolute -bottom-12">Neon Slide v1.0.4 - Proto-System</p>
            </motion.div>

            {/* Document Modals */}
            <AnimatePresence>
                {showPolicy && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex justify-center items-center bg-black/90 backdrop-blur-md px-6 py-12"
                    >
                        <div className="bg-[#050b14]/90 border border-[#00ffff]/30 w-full max-w-lg h-full max-h-[600px] rounded-[30px] p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.15)]">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,255,255,0.05)_0%,_transparent_70%)] pointer-events-none" />
                            <h2 className="text-[#00ffff] font-black tracking-widest uppercase mb-6 text-center text-xl drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">Privacy Protocol</h2>
                            <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-2 relative z-10">
                                <div className="text-white/70 text-xs flex flex-col gap-6 font-mono leading-relaxed tracking-wide">
                                    <p className="opacity-50 uppercase tracking-widest border-b border-[#00ffff]/20 pb-2">Last Updated: {new Date().toLocaleDateString()}</p>
                                    <p>Neon Slide (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how your information is collected, used, and disclosed when you use our mobile application (&quot;App&quot;).</p>
                                    
                                    <div>
                                        <p className="text-[#00ffff] font-bold uppercase mb-2 tracking-widest">1. Data Collection</p>
                                        <p>We collect device information and gameplay data to provide and improve the App. We do not collect personally identifiable information unless explicitly provided by you.</p>
                                    </div>

                                    <div>
                                        <p className="text-[#00ffff] font-bold uppercase mb-2 tracking-widest">2. Data Utilization</p>
                                        <ul className="list-disc pl-5 flex flex-col gap-2">
                                            <li>To save terminal progress (lives, credits, unlocked sectors).</li>
                                            <li>To display relevant transmissions (ads) via third-party providers.</li>
                                            <li>To improve gameplay mechanics and user experience.</li>
                                        </ul>
                                    </div>
                                    
                                    <div>
                                        <p className="text-[#00ffff] font-bold uppercase mb-2 tracking-widest">3. External Networks</p>
                                        <p>The App may use third-party services (e.g., ad networks like AdMob, analytics services) that may collect information used to identify you. These services operate under their own privacy protocols.</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-[#00ffff] font-bold uppercase mb-2 tracking-widest">4. Security</p>
                                        <p>Your game progress is saved locally on your device. Clearing app data will result in a complete memory wipe.</p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowPolicy(false)}
                                className="w-full mt-6 py-4 bg-[#00ffff]/10 border border-[#00ffff]/40 rounded-xl text-[#00ffff] font-black tracking-[0.3em] uppercase active:scale-95 transition-all hover:bg-[#00ffff]/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] relative z-10"
                            >ACKNOWLEDGE</button>
                        </div>
                    </motion.div>
                )}

                {showTerms && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex justify-center items-center bg-black/90 backdrop-blur-md px-6 py-12"
                    >
                        <div className="bg-[#050b14]/90 border border-[#00ffff]/30 w-full max-w-lg h-full max-h-[600px] rounded-[30px] p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.15)]">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,255,255,0.05)_0%,_transparent_70%)] pointer-events-none" />
                            <h2 className="text-[#00ffff] font-black tracking-widest uppercase mb-6 text-center text-xl drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">Terms of Service</h2>
                            <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-2 relative z-10">
                                <div className="text-white/70 text-xs flex flex-col gap-6 font-mono leading-relaxed tracking-wide">
                                    <p className="opacity-50 uppercase tracking-widest border-b border-[#00ffff]/20 pb-2">Last Updated: {new Date().toLocaleDateString()}</p>
                                    <p>By downloading or using the app, these terms will automatically apply to you – you should make sure therefore that you read them carefully before initiating the sequence.</p>
                                    
                                    <div>
                                        <p className="text-[#00ffff] font-bold uppercase mb-2 tracking-widest">1. Usage Rights</p>
                                        <p>You cannot copy, or modify the app, any part of the app, or our trademarks in any way. You are not allowed to attempt to extract the source code of the app, and you also should not try to translate the app into other languages, or make derivative versions.</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-[#00ffff] font-bold uppercase mb-2 tracking-widest">2. Virtual Assets</p>
                                        <p>Virtual items (Credits, Lives, Power-ups) purchased or earned within the App have no real-world value and cannot be exchanged for real currency. We reserve the right to modify, manage, control or eliminate virtual items at any time during system maintenance.</p>
                                    </div>
                                    
                                    <div>
                                        <p className="text-[#00ffff] font-bold uppercase mb-2 tracking-widest">3. System Updates</p>
                                        <p>The app is currently available on Android and iOS – the requirements for both systems may change, and you will need to download the updates if you want to keep using the app. We do not promise that it will always update the app so that it works with the version that you have installed.</p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowTerms(false)}
                                className="w-full mt-6 py-4 bg-[#00ffff]/10 border border-[#00ffff]/40 rounded-xl text-[#00ffff] font-black tracking-[0.3em] uppercase active:scale-95 transition-all hover:bg-[#00ffff]/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] relative z-10"
                            >ACKNOWLEDGE</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

type PowerUpType = 'hammer' | 'moveBoost' | 'shuffle' | 'ghost' | 'undo';

interface PowerUpInventory {
  hammer: number;
  moveBoost: number;
  shuffle: number;
  ghost: number;
  undo: number;
}

export default function App() {
  const [screen, setScreen] = useState<'splash' | 'menu' | 'levels' | 'game' | 'shop' | 'settings'>('splash');
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
      const saved = localStorage.getItem('neon_slide_progress');
      if (saved) {
          try {
              const data = JSON.parse(saved);
              return typeof data === 'number' ? data : (data.unlockedLevel || 0);
          } catch(e) {
              return parseInt(saved, 10) || 0;
          }
      }
      return 0;
  });
  const [levelStars, setLevelStars] = useState<Record<number, number>>(() => {
      const saved = localStorage.getItem('neon_slide_progress');
      if (saved) {
          try {
              const data = JSON.parse(saved);
              return data.stars || {};
          } catch(e) {
              return {};
          }
      }
      return {};
  });
  const [currentLevel, setCurrentLevel] = useState(0);
  const [coins, setCoins] = useState<number>(() => {
      const saved = localStorage.getItem('neon_slide_progress');
      if (saved) {
          try {
              const data = JSON.parse(saved);
              return data.coins ?? 0;
          } catch(e) {
              return 0;
          }
      }
      return 0;
  });
  const [powerups, setPowerups] = useState<PowerUpInventory>(() => {
      const defaultPowerups = {
          hammer: 3,
          moveBoost: 3,
          shuffle: 3,
          ghost: 3,
          undo: 3
      };
      const saved = localStorage.getItem('neon_slide_progress');
      if (saved) {
          try {
              const data = JSON.parse(saved);
              if (data.powerups) {
                  return { ...defaultPowerups, ...data.powerups };
              }
          } catch(e) {
              return defaultPowerups;
          }
      }
      return defaultPowerups;
  });

  const [lives, setLives] = useState<number>(() => {
      const saved = localStorage.getItem('neon_slide_progress');
      if (saved) {
          try {
              const data = JSON.parse(saved);
              return data.lives ?? 5;
          } catch(e) {
              return 5;
          }
      }
      return 5;
  });

  // Remove the old loading useEffect as it's now handled in useState
  useEffect(() => {
      // Progress is already loaded via lazy initialization
      
      const initAdMob = async () => {
          if (Capacitor.isNativePlatform()) {
              try {
                  await AdMob.initialize({
                      initializeForTesting: true,
                  });
                  console.log('AdMob initialized');
                  
                  // Preload a rewarded ad
                  await AdMob.prepareRewardVideoAd({
                      adId: 'ca-app-pub-3940256099942544/5224354917',
                  });
              } catch (e) {
                  console.error('Failed to initialize AdMob', e);
              }
          }
      };
      initAdMob();
  }, []);

  useEffect(() => {
      const progressData = {
          unlockedLevel,
          stars: levelStars,
          coins,
          powerups,
          lives
      };
      localStorage.setItem('neon_slide_progress', JSON.stringify(progressData));
  }, [unlockedLevel, levelStars, coins, powerups, lives]);


  const handleLevelComplete = (moves: number, earnedStars: number, claimedReward: number) => {
      const nextLevel = currentLevel + 1;
      
      setLevelStars(prev => ({
          ...prev,
          [currentLevel]: Math.max(prev[currentLevel] || 0, earnedStars)
      }));
      
      setUnlockedLevel(prev => Math.max(prev, nextLevel));
      setCoins(prev => prev + claimedReward);
      
      setScreen('levels');
  };

  return (
    <div className="min-h-[100dvh] bg-[#030712] text-slate-200 font-sans selection:bg-[#00ffff]/30 flex flex-col items-center justify-start pt-10 md:justify-center md:pt-4 p-4 overflow-x-hidden relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center -z-10">
           <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-[#00ffff]/[0.03] rounded-full blur-[150px] mix-blend-screen" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#ffaa00]/[0.03] rounded-full blur-[150px] mix-blend-screen" />
           <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] opacity-30" />
      </div>
      
      {screen === 'splash' && <SplashScreen onComplete={() => setScreen('menu')} />}
      {screen === 'menu' && <MenuScreen coins={coins} lives={lives} onNavigate={(s) => { audio.playTap(); setScreen(s === 'game' ? 'levels' : s); }} />}
      {screen === 'levels' && <LevelsScreen 
            unlockedLevel={unlockedLevel} 
            coins={coins}
            lives={lives}
            levelStars={levelStars}
            onSelectLevel={(l) => {
                if (lives > 0) {
                    setCurrentLevel(l);
                    setScreen('game');
                } else {
                    audio.playError();
                    setScreen('shop'); // Go to shop or open modal? Let's direct to shop
                }
            }} 
            onBack={() => setScreen('menu')} 
        />}
      {screen === 'game' && <GameScreen 
          levelIndex={currentLevel} 
          unlockedLevel={unlockedLevel}
          isUnlocked={true}
          onBack={() => setScreen('levels')} 
          onComplete={handleLevelComplete}
          onRestart={() => {}}
          coins={coins}
          setCoins={setCoins}
          powerups={powerups}
          setPowerups={setPowerups}
          lives={lives}
          setLives={setLives}
          onOutOfLives={() => setScreen('shop')}
        />}
      {screen === 'shop' && <ShopScreen 
          coins={coins} 
          lives={lives}
          setCoins={setCoins}
          setLives={setLives}
          powerups={powerups}
          setPowerups={setPowerups}
          onBack={() => setScreen('menu')} 
        />}
      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('menu')} />}
    </div>
  );
}

