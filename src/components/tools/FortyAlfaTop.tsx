import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface HistoryRow {
    period: string;
    pred: 'BIG' | 'SMALL';
    actualNum: number;
    actualSize: 'BIG' | 'SMALL';
    win: boolean;
}

export const FortyAlfaTop = () => {
    const [clock, setClock] = useState('--:--:-- IST');
    const [prediction, setPrediction] = useState('BIG');
    const [reason, setReason] = useState('follow trend');

    // Current Round Display
    const [period, setPeriod] = useState('----');
    const [number, setNumber] = useState('-');
    const [size, setSize] = useState<'BIG' | 'SMALL'>('BIG');

    // Stats
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxW, setMaxW] = useState(0);
    const [maxL, setMaxL] = useState(0);
    const [accuracy, setAccuracy] = useState('0%');

    // History logs
    const [history, setHistory] = useState<HistoryRow[]>([]);

    const lastEvalRef = useRef('');
    const lastFetchSecRef = useRef('');
    const statsRef = useRef(() => {
        try {
            return JSON.parse(localStorage.getItem('wingo30s_stats') || '{"w":0,"l":0,"c":0,"maxW":0,"maxL":0,"total":0}');
        } catch (e) {
            return { w: 0, l: 0, c: 0, maxW: 0, maxL: 0, total: 0 };
        }
    });

    const updateStatsDisplay = () => {
        const stats = statsRef.current();
        setWins(stats.w);
        setLosses(stats.l);
        setStreak(stats.c);
        setMaxW(stats.maxW);
        setMaxL(stats.maxL);
        const acc = stats.total ? Math.round((stats.w / stats.total) * 100) : 0;
        setAccuracy(acc + '%');
    };

    const handleClearStats = () => {
        if (confirm('Reset all stats?')) {
            localStorage.removeItem('wingo30s_stats');
            localStorage.removeItem('wingo30s_lastEval');
            statsRef.current = () => ({ w: 0, l: 0, c: 0, maxW: 0, maxL: 0, total: 0 });
            lastEvalRef.current = '';
            updateStatsDisplay();
            fetchHistoryData();
        }
    };

    const fetchHistoryData = async () => {
        try {
            const res = await fetch(`https://lluui.vercel.app/api/predict?page=4`);
            if (!res.ok) throw new Error('API failure');

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            const list = data.list || [];
            if (list.length < 2) return;

            const current = list[0];
            const prev = list[1];
            const curNum = Number(current.number);
            const curSize: 'BIG' | 'SMALL' = curNum >= 5 ? 'BIG' : 'SMALL';

            // Current panel
            setPeriod(String(current.issueNumber).slice(-4));
            setNumber(String(curNum));
            setSize(curSize);

            // Prediction is always the size of the latest draw
            const nextPred = curSize;
            setPrediction(nextPred);

            // Evaluate previous prediction
            const lastEval = lastEvalRef.current || localStorage.getItem('wingo30s_lastEval') || '';
            const stats = statsRef.current();

            if (current.issueNumber !== lastEval) {
                if (lastEval !== '') {
                    const predictedForCurrent = Number(prev.number) >= 5 ? 'BIG' : 'SMALL';
                    const isWin = predictedForCurrent === curSize;
                    stats.total++;
                    if (isWin) {
                        stats.w++;
                        stats.c = stats.c > 0 ? stats.c + 1 : 1;
                        if (stats.c > stats.maxW) stats.maxW = stats.c;
                    } else {
                        stats.l++;
                        stats.c = stats.c < 0 ? stats.c - 1 : -1;
                        if (Math.abs(stats.c) > stats.maxL) stats.maxL = Math.abs(stats.c);
                    }
                    localStorage.setItem('wingo30s_stats', JSON.stringify(stats));
                }
                lastEvalRef.current = current.issueNumber;
                localStorage.setItem('wingo30s_lastEval', current.issueNumber);
            }

            updateStatsDisplay();

            // Populate history (last 50 items)
            const rows: HistoryRow[] = [];
            for (let i = 0; i < Math.min(50, list.length - 1); i++) {
                const item = list[i];
                const itemPrev = list[i + 1];
                const p = Number(itemPrev.number) >= 5 ? 'BIG' : 'SMALL';
                const act = Number(item.number) >= 5 ? 'BIG' : 'SMALL';
                rows.push({
                    period: String(item.issueNumber).slice(-4),
                    pred: p,
                    actualNum: Number(item.number),
                    actualSize: act,
                    win: p === act
                });
            }
            setHistory(rows);

        } catch (error) {
            console.error(error);
        }
    };

    const getIstTime = () => {
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        return new Date(utc + 5.5 * 3600000);
    };

    useEffect(() => {
        updateStatsDisplay();
        fetchHistoryData();

        const timer = setInterval(() => {
            const t = getIstTime();
            const h = String(t.getHours()).padStart(2, '0');
            const m = String(t.getMinutes()).padStart(2, '0');
            const s = String(t.getSeconds()).padStart(2, '0');
            setClock(`${h}:${m}:${s} IST`);

            // Check timing trigger
            if ((s === '01' || s === '31') && s !== lastFetchSecRef.current) {
                lastFetchSecRef.current = s;
                fetchHistoryData();
            }
        }, 1000);

        // Fetch periodically as fallback (every 15 seconds)
        const fetchInterval = setInterval(fetchHistoryData, 15000);

        return () => {
            clearInterval(timer);
            clearInterval(fetchInterval);
        };
    }, []);

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-4 animate-fade-in text-[#e6f1ff] font-sans pb-12">
            {/* Top Clock Sticky emulation */}
            <div className="flex justify-between items-center bg-[#0a0f14]/85 border-b border-white/5 pb-3">
                <span className="text-sm font-extrabold tracking-wide">WINGO 30S - (40-Alfa TOP)</span>
                <span className="text-xs font-bold font-mono text-zinc-500 bg-[#0d141c] border border-white/5 py-1 px-3.5 rounded-lg">
                    {clock}
                </span>
            </div>

            {/* Prediction Panel */}
            <Card className="bg-[#141c24] border-white/5 p-6 shadow-2xl text-center space-y-3">
                <h3 className={`text-6xl font-black tracking-wider uppercase transition-transform ${
                    prediction === 'BIG' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(0,200,83,0.25)]' :
                    'text-rose-500 drop-shadow-[0_0_20px_rgba(255,61,0,0.25)]'
                }`}>
                    {prediction}
                </h3>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">{reason}</span>
            </Card>

            {/* Current period info */}
            <Card className="bg-[#141c24] border-white/5 p-4 flex justify-between items-center shadow-lg">
                <div className="text-left">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Current Period</span>
                    <div className="text-xl font-extrabold mt-0.5 text-white">{period}</div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-3xl font-black tracking-wider font-mono text-white">{number}</div>
                    <span className={`text-[10px] font-black uppercase py-1 px-3 border rounded-full ${
                        size === 'BIG' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'
                    }`}>
                        {size}
                    </span>
                </div>
            </Card>

            {/* Stats Dashboard */}
            <Card className="bg-[#141c24] border-white/5 p-4 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-[#e6f1ff]">Stats</span>
                    <Button
                        onClick={handleClearStats}
                        variant="outline"
                        className="text-[10px] font-bold border-white/10 text-zinc-400 h-7"
                    >
                        RESET STATS
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#0a0f14] border border-white/5 p-2 rounded-xl text-center">
                        <span className="text-lg font-black text-white">{wins}</span>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Wins</div>
                    </div>
                    <div className="bg-[#0a0f14] border border-white/5 p-2 rounded-xl text-center">
                        <span className="text-lg font-black text-white">{losses}</span>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Losses</div>
                    </div>
                    <div className="bg-[#0a0f14] border border-white/5 p-2 rounded-xl text-center">
                        <span className="text-lg font-black text-white">{streak > 0 ? `+${streak}` : streak}</span>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Streak</div>
                    </div>
                    <div className="bg-[#0a0f14] border border-white/5 p-2 rounded-xl text-center">
                        <span className="text-lg font-black text-white">{maxW}</span>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Max Win</div>
                    </div>
                    <div className="bg-[#0a0f14] border border-white/5 p-2 rounded-xl text-center">
                        <span className="text-lg font-black text-white">{maxL}</span>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Max Loss</div>
                    </div>
                    <div className="bg-[#0a0f14] border border-white/5 p-2 rounded-xl text-center">
                        <span className="text-lg font-black text-cyan-400">{accuracy}</span>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Accuracy</div>
                    </div>
                </div>
            </Card>

            {/* History Card list */}
            <Card className="bg-[#141c24] border-white/5 p-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                    <span className="text-xs font-extrabold text-[#e6f1ff]">History (last 50)</span>
                    <span className="border border-white/10 text-zinc-500 bg-[#0d141c] text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
                        No Skip
                    </span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {history.map((row, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-medium border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-zinc-500">#{row.period}</span>
                                <span className={`font-black text-sm ${
                                    row.pred === 'BIG' ? 'text-emerald-400' : 'text-rose-500'
                                }`}>
                                    {row.pred === 'BIG' ? 'B' : 'S'}
                                </span>
                                <span className="text-zinc-600 font-bold">→</span>
                                <span className="font-bold text-white text-sm">{row.actualNum}</span>
                            </div>
                            <div className="text-lg leading-none">{row.win ? '✅' : '❌'}</div>
                        </div>
                    ))}
                    {history.length === 0 && (
                        <div className="text-center py-14 text-zinc-700 italic">No historical records loaded yet.</div>
                    )}
                </div>
            </Card>

            <div className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest pt-2">
                Updates at :01 & :31 IST • Always follows last result
            </div>
        </div>
    );
};
