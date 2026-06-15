import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';

interface CompletedPrediction {
    issueNumber: string;
    predictedSize: string;
    actualSize: string;
    result: 'WIN' | 'LOSS';
}

interface ResultItem {
    issueNumber: string;
    rawNumber: number;
    size: string;
}

export const ArdinoMax = () => {
    const [predictionDisplay, setPredictionDisplay] = useState<string>('—');
    const [nextIssueHint, setNextIssueHint] = useState<string>('waiting for data...');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [accuracy, setAccuracy] = useState('0%');
    const [streak, setStreak] = useState(0);
    const [maxWin, setMaxWin] = useState(0);
    const [maxLoss, setMaxLoss] = useState(0);
    const [completedPredictions, setCompletedPredictions] = useState<CompletedPrediction[]>([]);

    const allResultsRef = useRef<ResultItem[]>([]);
    const currentPendingRef = useRef<{ predictedSize: string } | null>(null);
    const lastProcessedIssueRef = useRef<string | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const soundEnabledRef = useRef(true);

    // Keep soundEnabledRef in sync
    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    // ---------- Helper: Number to Size ----------
    const numberToSize = (num: number | string) => {
        const n = parseInt(String(num), 10);
        return (n >= 0 && n <= 4) ? 'Small' : 'Big';
    };

    // ---------- Beep sound ----------
    const beepSequence = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        let count = 0;
        const beep = () => {
            if (count >= 3) return;
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.frequency.value = 880;
            gain.gain.value = 0.2;
            oscillator.type = 'sine';
            oscillator.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.25);
            oscillator.stop(ctx.currentTime + 0.25);
            count++;
            if (count < 3) setTimeout(beep, 280);
        };
        beep();
    }, []);

    const playBeep = useCallback(() => {
        if (!soundEnabledRef.current) return;
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume().then(beepSequence).catch(() => {});
            } else {
                beepSequence();
            }
        } catch (e) { /* ignore */ }
    }, [beepSequence]);

    // ---------- Advanced Prediction Logic ----------
    const predictNextFromHistory = (history: { size: string; rawNumber: number }[]): string => {
        if (!history.length) return 'Big';
        const windowSize = Math.min(6, history.length);
        const recent = history.slice(-windowSize);
        const sizes = recent.map(r => r.size);
        const numbers = recent.map(r => r.rawNumber);

        // Volatility mode
        let altCount = 0;
        for (let i = 1; i < sizes.length; i++) {
            if (sizes[i] !== sizes[i - 1]) altCount++;
        }
        if (sizes.length >= 4 && altCount >= 3) {
            return sizes[sizes.length - 1];
        }

        // Trap detection: streak >= 3
        let streakSame = 1;
        for (let i = sizes.length - 1; i > 0; i--) {
            if (sizes[i] === sizes[i - 1]) streakSame++;
            else break;
        }
        if (streakSame >= 3) {
            return (sizes[sizes.length - 1] === 'Big') ? 'Small' : 'Big';
        }

        // Gravity override
        if (numbers.length >= 5) {
            const lastTwoBig = numbers.slice(-2).every(n => n >= 6);
            const prevThreeSmall = numbers.slice(-5, -2).every(n => n <= 3);
            if (lastTwoBig && prevThreeSmall) return 'Small';

            const lastTwoSmall = numbers.slice(-2).every(n => n <= 3);
            const prevThreeBig = numbers.slice(-5, -2).every(n => n >= 6);
            if (lastTwoSmall && prevThreeBig) return 'Big';
        }

        // Majority
        const bigCount = sizes.filter(s => s === 'Big').length;
        const smallCount = sizes.length - bigCount;
        if (bigCount > smallCount) return 'Big';
        if (smallCount > bigCount) return 'Small';
        return sizes[sizes.length - 1];
    };

    // ---------- Update UI stats ----------
    const updateStats = (preds: CompletedPrediction[]) => {
        const total = preds.length;
        const correct = preds.filter(p => p.result === 'WIN').length;
        setAccuracy(total === 0 ? '0%' : `${(correct / total * 100).toFixed(1)}%`);

        let s = 0;
        for (let i = preds.length - 1; i >= 0; i--) {
            if (preds[i].result === 'WIN') s++;
            else break;
        }
        setStreak(s);

        let mw = 0, ml = 0, cw = 0, cl = 0;
        for (const p of preds) {
            if (p.result === 'WIN') { cw++; cl = 0; if (cw > mw) mw = cw; }
            else { cl++; cw = 0; if (cl > ml) ml = cl; }
        }
        setMaxWin(mw);
        setMaxLoss(ml);
    };

    // ---------- Generate new pending ----------
    const generateNewPending = () => {
        const historyForPred = allResultsRef.current.map(r => ({ size: r.size, rawNumber: r.rawNumber }));
        const nextPred = predictNextFromHistory(historyForPred);
        currentPendingRef.current = { predictedSize: nextPred };
        setPredictionDisplay(nextPred);
        if (allResultsRef.current.length > 0) {
            const lastIssue = allResultsRef.current[allResultsRef.current.length - 1].issueNumber;
            setNextIssueHint(`Next issue ~${lastIssue.slice(-5)} → +1`);
        } else {
            setNextIssueHint('Awaiting data...');
        }
    };

    // ---------- Process new results ----------
    const processNewResults = (newResultsAsc: ResultItem[], shouldBeep: boolean) => {
        if (!newResultsAsc.length) return;
        const newCompleted: CompletedPrediction[] = [];

        for (const res of newResultsAsc) {
            if (allResultsRef.current.some(r => r.issueNumber === res.issueNumber)) continue;

            if (currentPendingRef.current) {
                const predicted = currentPendingRef.current.predictedSize;
                const actual = res.size;
                const result: 'WIN' | 'LOSS' = (predicted === actual) ? 'WIN' : 'LOSS';
                newCompleted.push({ issueNumber: res.issueNumber, predictedSize: predicted, actualSize: actual, result });
                currentPendingRef.current = null;
            } else {
                const historyBefore = [...allResultsRef.current];
                let predBack = 'Big';
                if (historyBefore.length > 0) {
                    predBack = predictNextFromHistory(historyBefore.map(r => ({ size: r.size, rawNumber: r.rawNumber })));
                }
                const resultBack: 'WIN' | 'LOSS' = (predBack === res.size) ? 'WIN' : 'LOSS';
                newCompleted.push({ issueNumber: res.issueNumber, predictedSize: predBack, actualSize: res.size, result: resultBack });
            }

            allResultsRef.current.push(res);
        }

        allResultsRef.current.sort((a, b) => a.issueNumber.localeCompare(b.issueNumber));

        if (allResultsRef.current.length > 0) {
            generateNewPending();
            if (shouldBeep && newCompleted.length > 0) playBeep();
        }

        if (newCompleted.length > 0) {
            setCompletedPredictions(prev => {
                const updated = [...prev, ...newCompleted];
                updateStats(updated);
                return updated;
            });
        }
    };

    // ---------- Fetch API ----------
    const fetchWinGoData = useCallback(async () => {
        try {
            const ts = Date.now();
            const url = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;
            const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            if (json.code !== 0 || !json.data?.list) throw new Error('Invalid API response');

            const rawList = json.data.list;
            const sortedAsc = [...rawList].sort((a: any, b: any) => a.issueNumber.localeCompare(b.issueNumber));
            const mapped: ResultItem[] = sortedAsc.map((item: any) => ({
                issueNumber: item.issueNumber,
                rawNumber: parseInt(item.number, 10),
                size: numberToSize(item.number)
            }));
            if (!mapped.length) return;

            const latestIncoming = mapped[mapped.length - 1].issueNumber;
            if (lastProcessedIssueRef.current === latestIncoming) return;

            let startIdx = 0;
            if (lastProcessedIssueRef.current) {
                const existingIdx = mapped.findIndex(r => r.issueNumber === lastProcessedIssueRef.current);
                startIdx = existingIdx !== -1 ? existingIdx + 1 : 0;
            }

            const newResults = mapped.slice(startIdx);
            if (!newResults.length) return;

            lastProcessedIssueRef.current = latestIncoming;
            processNewResults(newResults, true);
        } catch (err) {
            setNextIssueHint('⚠️ API error, retrying...');
        }
    }, [playBeep]);

    // ---------- Schedule at IST :01 second ----------
    const scheduleAtSecond01 = useCallback(() => {
        const now = new Date();
        const seconds = now.getSeconds();
        const msUntilNext01 = (60 - seconds + 1) * 1000 - now.getMilliseconds();
        setTimeout(() => {
            fetchWinGoData();
            if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
            fetchIntervalRef.current = setInterval(fetchWinGoData, 60000);
        }, msUntilNext01);
    }, [fetchWinGoData]);

    // ---------- Init ----------
    useEffect(() => {
        currentPendingRef.current = { predictedSize: 'Big' };
        setPredictionDisplay('Big');
        setNextIssueHint('Waiting for first data...');

        scheduleAtSecond01();

        return () => {
            if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
        };
    }, [scheduleAtSecond01]);

    // ---------- Sound Toggle ----------
    const handleSoundToggle = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        try {
            if (next) {
                if (!audioCtxRef.current) {
                    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                audioCtxRef.current.resume();
            } else {
                audioCtxRef.current?.suspend();
            }
        } catch (e) { /* ignore */ }
    };

    const isBig = predictionDisplay === 'Big';
    const recent20 = [...completedPredictions].reverse().slice(0, 20);

    return (
        <div className="w-full max-w-xl mx-auto p-4 space-y-4 pb-12 font-sans"
            style={{ background: 'linear-gradient(145deg, #0b1120 0%, #111827 100%)', minHeight: '100vh', color: '#e2e8f0' }}>

            {/* Live Prediction Card */}
            <Card className="rounded-3xl p-6 text-center space-y-4 border"
                style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#334155' }}>

                <div className="inline-block text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                    style={{ background: '#2d3a5e', color: '#b9c8ff', letterSpacing: '2px' }}>
                    ⚡ LIVE PREDICTION (IST :01 sec sync)
                </div>

                <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>🔮 Next Outcome →</p>

                <div className="text-7xl font-black tracking-widest"
                    style={{
                        background: 'linear-gradient(135deg, #facc15, #ffb347)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 0 8px rgba(250,204,21,0.3)'
                    }}>
                    {predictionDisplay}
                </div>

                <div className="inline-block font-mono text-xs px-4 py-1.5 rounded-full"
                    style={{ background: '#00000040', color: '#94a3b8' }}>
                    {nextIssueHint}
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleSoundToggle}
                        className="flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all"
                        style={{
                            background: soundEnabled ? '#ef4444' : '#2d3a5e',
                            color: 'white',
                            boxShadow: soundEnabled ? '0 0 8px #ef4444' : 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}>
                        {soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'Accuracy', value: accuracy, color: '#facc15' },
                        { label: 'Current Streak', value: streak, color: '#facc15' },
                        { label: 'Max Wins 🔥', value: maxWin, color: '#4ade80' },
                        { label: 'Max Loss 💧', value: maxLoss, color: '#f87171' },
                    ].map((stat, i) => (
                        <div key={i} className="rounded-2xl p-3 text-center"
                            style={{ background: '#0f172a', borderBottom: '2px solid #3b82f6' }}>
                            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="text-[10px] uppercase opacity-70 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* History Table */}
            <Card className="rounded-3xl p-5 space-y-3 border"
                style={{ background: 'rgba(18,25,45,0.85)', borderColor: 'rgba(74,144,226,0.25)', backdropFilter: 'blur(8px)' }}>

                <div className="flex justify-between items-center">
                    <span className="inline-block text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                        style={{ background: '#2d3a5e', color: '#b9c8ff' }}>
                        📋 PREDICTION HISTORY (last 20 resolved)
                    </span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>🔄 auto updates</span>
                </div>

                <div className="overflow-x-auto rounded-2xl">
                    <table className="w-full text-center text-xs border-collapse">
                        <thead>
                            <tr style={{ background: '#0f172a', color: '#cbd5e1' }}>
                                <th className="py-2.5 px-3 font-semibold">Issue</th>
                                <th className="py-2.5 px-3 font-semibold">Prediction</th>
                                <th className="py-2.5 px-3 font-semibold">Actual</th>
                                <th className="py-2.5 px-3 font-semibold">Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent20.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-10 italic" style={{ color: '#5b6e8c' }}>
                                        loading history...
                                    </td>
                                </tr>
                            ) : recent20.map((pred, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                                    <td className="py-2.5 font-mono">{pred.issueNumber.slice(-5)}</td>
                                    <td className="py-2.5">
                                        <span className="px-2.5 py-0.5 rounded-full font-bold text-xs"
                                            style={{ background: '#1e293b', color: 'white' }}>
                                            {pred.predictedSize}
                                        </span>
                                    </td>
                                    <td className="py-2.5">{pred.actualSize}</td>
                                    <td className={`py-2.5 font-bold ${pred.result === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                                        {pred.result === 'WIN' ? '✅ WIN' : '❌ LOSS'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Footer */}
            <div className="rounded-2xl p-4 text-center space-y-1.5"
                style={{ background: 'rgba(18,25,45,0.85)', border: '1px solid rgba(74,144,226,0.15)' }}>
                <div className="text-sm font-bold" style={{ color: '#facc15' }}>
                    🤖 About ARDINO MAX
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                    ARDINO MAX watches every WinGo 1M draw in real time and gives you a <strong style={{ color: '#e2e8f0' }}>Big or Small</strong> prediction before each round starts.
                    It learns from recent patterns — spotting streaks, alternating trends, and reversals — so you always have a smart signal ready.
                </p>
                <p className="text-xs" style={{ color: '#64748b' }}>
                    🔔 Auto-updates every minute &nbsp;|&nbsp; 🔊 Beeps on each new prediction
                </p>
            </div>
        </div>
    );
};
