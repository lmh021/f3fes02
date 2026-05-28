import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Clock, Volume2, VolumeX, Flag, Sparkles, Plus, Minus, Bell, BookOpen } from 'lucide-react';

interface Lap {
  id: number;
  timeMs: number;
  formattedTime: string;
  splitMs: number;
  formattedSplit: string;
}

export default function TimerPanel() {
  // Modes: 'countdown' or 'stopwatch'
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown');

  // Common Sound setting
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // --- countdown Timer States ---
  const [presetDuration, setPresetDuration] = useState<number>(240); // default 4 mins (240s)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(240);
  const [countRunning, setCountRunning] = useState<boolean>(false);
  const [audioFeedbackTriggered, setAudioFeedbackTriggered] = useState<{ [time: number]: boolean }>({});

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Stopwatch States ---
  const [stopwatchTime, setStopwatchTime] = useState<number>(0); // in ms
  const [stopwatchRunning, setStopwatchRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const stopwatchStartTimeRef = useRef<number>(0);
  const stopwatchAccumulatedTimeRef = useRef<number>(0);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        // High pitched brief warning beep
        playTone(900, 0, 0.25);
      } else if (type === 'bell') {
        // Double ding
        playTone(600, 0, 0.4, 1.2);
        playTone(750, 0.12, 0.6, 1.0);
      } else if (type === 'triple') {
        // Complete exam start/end indicator
        playTone(523.25, 0, 0.4); // C5
        playTone(659.25, 0.15, 0.4); // E5
        playTone(783.99, 0.3, 0.6); // G5
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

  // --- Stopwatch Mechanics ---
  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchStartTimeRef.current = Date.now() - stopwatchAccumulatedTimeRef.current;
      stopwatchIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - stopwatchStartTimeRef.current;
        setStopwatchTime(elapsed);
        stopwatchAccumulatedTimeRef.current = elapsed;
      }, 10);
    } else {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    }

    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [stopwatchRunning]);

  const toggleStopwatch = () => {
    setStopwatchRunning(!stopwatchRunning);
  };

  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
    stopwatchAccumulatedTimeRef.current = 0;
    setLaps([]);
  };

  const recordLap = () => {
    const elapsed = stopwatchTime;
    const lastLapTime = laps.length > 0 ? laps[0].timeMs : 0;
    const splitTime = elapsed - lastLapTime;

    const formatMs = (msCount: number) => {
      const min = Math.floor(msCount / 60000);
      const sec = Math.floor((msCount % 60000) / 1000);
      const ms = Math.floor((msCount % 1000) / 10);
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const newLap: Lap = {
      id: laps.length + 1,
      timeMs: elapsed,
      formattedTime: formatMs(elapsed),
      splitMs: splitTime,
      formattedSplit: formatMs(splitTime)
    };

    setLaps([newLap, ...laps]);
  };

  // Formatter utilities
  const formatCountdownDisplay = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStopwatchDisplay = (msCount: number) => {
    const hours = Math.floor(msCount / 3600000);
    const mins = Math.floor((msCount % 3600000) / 60000);
    const secs = Math.floor((msCount % 60000) / 1000);
    const ms = Math.floor((msCount % 1000) / 10);

    const padHrs = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
    return `${padHrs}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
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
            Administer examination milestones with precision. Switch between standardized preset Speaking timers or use the split-lap stopwatch for group interaction monitoring. Contains built-in synth chime indicators.
          </p>
        </div>
      </div>

      {/* Selector and Option Switches */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex bg-slate-100 dark:bg-[#0F172A] p-1 rounded-xl self-start sm:self-auto border dark:border-slate-800">
          <button
            onClick={() => setMode('countdown')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              mode === 'countdown'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Timer size={14} /> Preset Countdown Timer
          </button>
          <button
            onClick={() => setMode('stopwatch')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              mode === 'stopwatch'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={14} /> Interval Stopwatch
          </button>
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
              <Volume2 size={15} /> <span>Acoustic Alerts: ON</span>
            </>
          ) : (
            <>
              <VolumeX size={15} /> <span>Acoustic Alerts: Muted</span>
            </>
          )}
        </button>
      </div>

      {mode === 'countdown' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Preset Buttons - Left */}
          <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <BookOpen size={15} className="text-blue-500" /> Exam Standard Presets
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Apply standard milestones designated by standard oral assessment regulations:
            </p>

            <div className="space-y-2.5">
              {[
                { label: '10-Min Prep Room Session', s: 600, desc: 'Preparation of student prompt cards' },
                { label: '4-Min Discussion (4 Studs)', s: 240, desc: 'Standard Group Interaction milestone' },
                { label: '3-Min Discussion (3 Studs)', s: 180, desc: 'Group Interaction for small cohorts' },
                { label: '1-Min Oral Response Check', s: 60, desc: 'Individual Examiner Question period' },
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
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 dark:text-slate-500 block">Custom Duration Controls:</span>
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
            {/* Ambient circular track bg */}
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
              {/* Circular Style Timer Wrapper or Label */}
              <div className="text-[10px] uppercase tracking-widest font-bold font-mono text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-[#0F172A] rounded-full px-4 py-1.5 border dark:border-slate-800 inline-block">
                {countdownSeconds === 0 ? '🕒 Examination Time Finished' : countRunning ? '⚡ Countdown session active' : '⏸️ Session Standing By'}
              </div>

              {/* Jumbo Clock Display */}
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
                Preset time: <strong className="font-mono">{formatCountdownDisplay(presetDuration)}</strong> • Countdown completes with custom triple exam chiming.
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
                    <Play size={16} className="fill-current" /> Start countdown
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main stopwatch display - Left */}
          <div className="lg:col-span-7 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-center text-center">
            
            <div className="my-auto py-12 space-y-4">
              <div className="text-[10px] uppercase tracking-widest font-bold font-mono text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-[#0F172A] rounded-full px-4 py-1.5 border dark:border-slate-800 inline-block">
                ⏱️ Interval Roster Stopwatch
              </div>

              {/* Jumbo Milliseconds display */}
              <div className="font-mono text-6xl sm:text-7xl font-black tracking-tighter text-slate-800 dark:text-white select-all">
                {formatStopwatchDisplay(stopwatchTime)}
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Accurately clock student performance durations down to 10ms intervals. Click <strong className="font-semibold text-blue-500 font-mono">Lap / Record</strong> to save splits below.
              </p>
            </div>

            {/* controls row */}
            <div className="flex items-center gap-4 w-full border-t border-slate-100 dark:border-slate-800 pt-6">
              <button
                onClick={resetStopwatch}
                className="flex-1 py-3 text-xs font-bold border border-slate-205 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-[#0F172A] text-slate-700 dark:text-slate-350 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 select-none"
              >
                <RotateCcw size={15} /> Reset
              </button>

              <button
                onClick={recordLap}
                disabled={stopwatchTime === 0}
                className="flex-1 py-3 text-xs font-bold border border-slate-205 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-[#0F172A] text-slate-700 dark:text-slate-350 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 select-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Flag size={15} /> Lap / Record
              </button>

              <button
                onClick={toggleStopwatch}
                className={`flex-[1.5] py-3 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 select-none shadow-sm ${
                  stopwatchRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-lg'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                }`}
              >
                {stopwatchRunning ? (
                  <>
                    <Pause size={15} className="fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play size={15} className="fill-current" /> Start clock
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Laps Record - Right */}
          <div className="lg:col-span-5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between max-h-[440px]">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Flag size={14} className="text-blue-500" /> Recorded Laps & Split Times
                </h4>
                <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 dark:bg-[#0F172A] border dark:border-slate-800 rounded-full px-2.5 py-0.5">
                  Records: {laps.length}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1">
                {laps.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 dark:text-slate-550 text-xs flex flex-col items-center justify-center gap-2">
                    <Flag size={20} className="stroke-[1.5] opacity-50 block text-slate-400" />
                    No interval lap logs recorded in this session.
                  </div>
                ) : (
                  laps.map((lp, idx) => (
                    <div 
                      key={lp.id}
                      className="p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase">
                          Lap #{laps.length - idx}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {lp.formattedTime}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-mono">
                          Split interval
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                          +{lp.formattedSplit}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {laps.length > 0 && (
              <button
                onClick={() => setLaps([])}
                className="w-full text-center py-2 border border-rose-100 hover:bg-rose-50 dark:border-rose-950/30 dark:hover:bg-rose-950/20 text-rose-500 font-bold text-xs rounded-xl transition cursor-pointer select-none mt-4"
              >
                Clear Lap Records
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
