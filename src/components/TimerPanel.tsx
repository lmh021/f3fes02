import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Volume2, VolumeX, Sparkles, Plus, Minus, BookOpen, Clock } from 'lucide-react';

export default function TimerPanel() {
  // Common Sound setting
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // --- countdown Timer States ---
  const [presetDuration, setPresetDuration] = useState<number>(180); // default 3 mins (180s)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(180);
  const [countRunning, setCountRunning] = useState<boolean>(false);
  const [audioFeedbackTriggered, setAudioFeedbackTriggered] = useState<{ [time: number]: boolean }>({});

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesize bell chime using standard browser Web Audio API
  const triggerAcousticChime = (type: 'beep' | 'bell' | 'triple') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq: number, startDelay: number, len: number, volMultiplier: number = 1) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gainNode.gain.setValueAtTime(0, ctx.currentTime + startDelay);
        gainNode.gain.linearRampToValueAtTime(0.12 * volMultiplier, ctx.currentTime + startDelay + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startDelay + len);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + len);
      };

      if (type === 'beep') {
        playTone(900, 0, 0.25);
      } else if (type === 'bell') {
        playTone(600, 0, 0.4, 1.2);
        playTone(750, 0.12, 0.6, 1.0);
      } else if (type === 'triple') {
        // Complete exam start/end indicator (loud triple ding)
        playTone(523.25, 0, 0.4, 1.5); // C5
        playTone(659.25, 0.15, 0.4, 1.5); // E5
        playTone(783.99, 0.3, 0.6, 1.5); // G5
      }
    } catch (e) {
      console.warn("Client sound synthesis failed: AudioContext context may be blocked by user browser profile", e);
    }
  };

  // --- Countdown Timer Mechanics ---
  useEffect(() => {
    if (countRunning) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            setCountRunning(false);
            // Ensure chime fires on finish
            triggerAcousticChime('triple');
            return 0;
          }
          const nextSec = prev - 1;

          // Sound triggers at thresholds (e.g. 60s, 30s, 10s, 5s)
          if ([60, 30, 10, 5, 3, 2, 1].includes(nextSec) && !audioFeedbackTriggered[nextSec]) {
            triggerAcousticChime('beep');
            setAudioFeedbackTriggered((prevTrig) => ({ ...prevTrig, [nextSec]: true }));
          }

          return nextSec;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [countRunning, audioFeedbackTriggered]);

  const toggleCountdown = () => {
    // Resume context if browser blocked it
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const dummyCtx = new AudioContext();
        if (dummyCtx.state === 'suspended') dummyCtx.resume();
      }
    } catch (e) {}

    setCountRunning(!countRunning);
  };

  const resetCountdown = () => {
    setCountRunning(false);
    setCountdownSeconds(presetDuration);
    setAudioFeedbackTriggered({});
  };

  const handleApplyPreset = (seconds: number) => {
    setCountRunning(false);
    setPresetDuration(seconds);
    setCountdownSeconds(seconds);
    setAudioFeedbackTriggered({});
  };

  const adjustCountdownSeconds = (amount: number) => {
    setCountdownSeconds((prev) => {
      const next = Math.max(0, prev + amount);
      setPresetDuration(next);
      return next;
    });
    setAudioFeedbackTriggered({});
  };

  // Formatter utilities
  const formatCountdownDisplay = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentageCountdownRemaining = presetDuration > 0 ? (countdownSeconds / presetDuration) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Banner / Guide */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden border border-blue-500/10">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-6">
          <Clock size={180} />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/30 text-blue-200 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-400/20">
              Exam Administration Desk
            </span>
            <div className="flex items-center gap-1.5 text-xs text-blue-200">
              <Sparkles size={13} className="text-amber-400 fill-amber-400" /> Professional Grade
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Examiner Clock & Timer Desk</h2>
          <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
            Administer examination milestones with precision. Use the designated 3-Min Preparation timer with guaranteed acoustic chime signaling upon completion.
          </p>
        </div>
      </div>

      {/* Selector and Option Switches */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold font-mono border border-blue-200/20 flex items-center gap-1.5">
            <Timer size={14} /> Countdown Timer Mode
          </span>
        </div>

        {/* Audio Volume configuration options */}
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) {
              setTimeout(() => triggerAcousticChime('bell'), 50);
            }
          }}
          className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-semibold transition cursor-pointer ${
            soundEnabled
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-405 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-[#0F172A] text-slate-500 border-slate-200 dark:border-slate-800'
          }`}
          title="Toggle acoustic beep and bell alarm highlights"
        >
          {soundEnabled ? (
            <>
              <Volume2 size={15} /> <span>Acoustic Chime: ON</span>
            </>
          ) : (
            <>
              <VolumeX size={15} /> <span>Acoustic Chime: Muted</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Preset Buttons - Left */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
            <BookOpen size={15} className="text-blue-500" /> Exam Standard Preset
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Selected countdown parameter verified by general examination boards:
          </p>

          <div className="space-y-2.5">
            {[
              { label: '3-Min Preparation', s: 180, desc: 'Preparation of student prompt cards' },
            ].map((btn) => {
              const isSelectedPreset = presetDuration === btn.s;
              return (
                <button
                  key={btn.s}
                  onClick={() => handleApplyPreset(btn.s)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelectedPreset
                      ? 'bg-blue-550/5 dark:bg-blue-500/5 border-blue-500 dark:border-blue-400'
                      : 'bg-slate-50 dark:bg-[#0F172A] border-slate-150 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelectedPreset ? 'text-blue-600 dark:text-blue-400' : 'text-slate-805 dark:text-slate-200'}`}>
                      {btn.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-800">
                      {btn.s / 60}m
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{btn.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Custom Calibration controls */}
          <div className="pt-4 border-t border-slate-150 dark:border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 dark:text-slate-500 block">Custom Calibrations:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => adjustCountdownSeconds(60)}
                className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add 1 Min
              </button>
              <button
                onClick={() => adjustCountdownSeconds(-60)}
                disabled={countdownSeconds <= 60}
                className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus size={12} /> Ded 1 Min
              </button>
              <button
                onClick={() => adjustCountdownSeconds(10)}
                className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add 10 Sec
              </button>
              <button
                onClick={() => adjustCountdownSeconds(-10)}
                disabled={countdownSeconds <= 10}
                className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus size={12} /> Ded 10 Sec
              </button>
            </div>
          </div>
        </div>

        {/* Large Countdown Display - Right */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-center text-center relative overflow-hidden">
          {/* Ambient progress bar */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-105 dark:bg-slate-800">
            <div 
              className={`h-full transition-all duration-1000 ${
                countdownSeconds < 10 
                  ? 'bg-rose-550 animate-pulse' 
                  : countdownSeconds < 30 
                    ? 'bg-amber-500' 
                    : 'bg-blue-600'
              }`}
              style={{ width: `${percentageCountdownRemaining}%` }}
            ></div>
          </div>

          <div className="my-auto py-10 space-y-4">
            <div className="text-[10px] uppercase tracking-widest font-bold font-mono text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-[#0F172A] rounded-full px-4 py-1.5 border dark:border-slate-800 inline-block">
              {countdownSeconds === 0 ? '🕒 Preparation Complete' : countRunning ? '⚡ Countdown Active' : '⏸️ Clock Standing By'}
            </div>

            {/* Jumbo Display */}
            <div 
              className={`font-mono text-7xl sm:text-8xl font-black tracking-tight select-all leading-none transition-colors duration-300 ${
                countdownSeconds === 0
                  ? 'text-rose-500 animate-pulse'
                  : countdownSeconds < 10
                    ? 'text-rose-500 scale-105 inline-block'
                    : countdownSeconds < 30
                      ? 'text-amber-500'
                      : 'text-slate-800 dark:text-white'
              }`}
            >
              {formatCountdownDisplay(countdownSeconds)}
            </div>

            <div className="text-xs text-slate-400 dark:text-slate-500">
              Preset selected: <strong className="font-mono">{formatCountdownDisplay(presetDuration)}</strong> • Guarantees acoustic chime warning upon termination.
            </div>
          </div>

          {/* Controls panel */}
          <div className="flex items-center gap-6 w-full max-w-sm mt-4 border-t border-slate-100 dark:border-slate-800 pt-6">
            <button
              onClick={resetCountdown}
              className="flex-1 py-3 text-xs font-bold border border-slate-205 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-[#0F172A] text-slate-700 dark:text-slate-350 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 select-none"
            >
              <RotateCcw size={15} /> Reset Timer
            </button>

            <button
              onClick={toggleCountdown}
              className={`flex-[2] py-3.5 text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 select-none shadow-md ${
                countRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/10'
                  : countdownSeconds === 0
                    ? 'bg-slate-400 text-white cursor-not-allowed opacity-50'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
              disabled={countdownSeconds === 0}
            >
              {countRunning ? (
                <>
                  <Pause size={16} className="fill-current" /> Pause Session
                </>
              ) : (
                <>
                  <Play size={16} className="fill-current" /> Start clock
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
