import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogItem {
    period: number;
    pick: string;
    res: string;
    status: 'WIN' | 'LOSS' | 'JACKPOT';
}

export const PrecisionOracle = () => {
    const [period, setPeriod] = useState('');
    const [resultNum, setResultNum] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Prediction State
    const [prediction, setPrediction] = useState<{
        final: string;
        mathSig: string;
        memSig: string;
        nums: number[];
        targetPeriod: number;
    } | null>(null);

    // Auto-fetch State
    const [isAutoFetch, setIsAutoFetch] = useState(false);
    const [lastProcessedPeriod, setLastProcessedPeriod] = useState<number | null>(null);
    const [lastResultNum, setLastResultNum] = useState<number | null>(null);

    // Logs
    const [logs, setLogs] = useState<LogItem[]>([]);
    
    const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const activePredictionRef = useRef<{ period: number; pick: string; nums: number[] } | null>(null);

    // Auto-fetch implementation
    const fetchPrediction = async (isManual = false) => {
        try {
            if (isManual) setIsLoading(true);
            const res = await fetch(`/api/predict?page=1`);
            if (!res.ok) throw new Error('Failed to fetch prediction');
            
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            const serverPeriod = data.serverPeriod;
            const latestResult = data.resultNum;
            const outcome = data.outcome;

            // Manual Fetch or New Period
            const isNewUpdate = (serverPeriod !== lastProcessedPeriod) || (latestResult !== lastResultNum);

            if (isNewUpdate || isManual) {
                setLastProcessedPeriod(serverPeriod);
                setLastResultNum(latestResult);

                // Set inputs
                const nextPeriod = serverPeriod + 1;
                setPeriod(String(nextPeriod).slice(-3));
                setResultNum(String(latestResult));

                // Set predictions
                setPrediction({
                    final: data.final,
                    mathSig: data.mathSig,
                    memSig: data.memSig,
                    nums: data.nums,
                    targetPeriod: nextPeriod
                });

                // Check Win/Loss of Previous Active Prediction
                const activePred = activePredictionRef.current;
                if (activePred && activePred.period === serverPeriod && activePred.pick !== "Skip") {
                    const won = (activePred.pick === outcome);
                    const exact = activePred.nums.includes(latestResult);
                    const status = exact ? 'JACKPOT' : (won ? 'WIN' : 'LOSS');

                    setLogs(prev => [
                        { period: serverPeriod, pick: activePred.pick, res: outcome, status },
                        ...prev
                    ]);
                }

                // Update Active Prediction for future checks
                activePredictionRef.current = {
                    period: nextPeriod,
                    pick: data.final,
                    nums: data.nums
                };
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            if (isManual) toast.error('Error fetching prediction details.');
        } finally {
            if (isManual) setIsLoading(false);
        }
    };

    // Handle Manual Predict
    const handleManualPredict = async () => {
        if (!period || resultNum === '') {
            toast.error("Please enter next period and current number.");
            return;
        }

        const inputNum = parseInt(resultNum);
        if (isNaN(inputNum) || inputNum < 0 || inputNum > 9) {
            toast.error("Current number must be between 0 and 9.");
            return;
        }

        setIsLoading(true);
        try {
            // Re-run matching math & memory signals directly for manual calculation
            const response = await fetch(`/api/predict?page=1`);
            const data = await response.json();
            
            if (data.success) {
                // Manually trigger updates
                setPrediction({
                    final: data.final,
                    mathSig: data.mathSig,
                    memSig: data.memSig,
                    nums: data.nums,
                    targetPeriod: lastProcessedPeriod ? lastProcessedPeriod + 1 : serverPeriodFromInput(period)
                });
                toast.success('Analysis completed.');
            }
        } catch (error) {
            toast.error('Failed to run analysis.');
        } finally {
            setIsLoading(false);
        }
    };

    const serverPeriodFromInput = (pStr: string) => {
        const d = new Date();
        const base = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
        return parseInt(base + pStr.padStart(3, '0'));
    };

    // Toggle Auto-fetch
    const toggleAutoFetch = () => {
        setIsAutoFetch(prev => !prev);
    };

    useEffect(() => {
        if (isAutoFetch) {
            fetchPrediction(true);
            autoIntervalRef.current = setInterval(() => {
                fetchPrediction();
            }, 3000);
        } else {
            if (autoIntervalRef.current) {
                clearInterval(autoIntervalRef.current);
                autoIntervalRef.current = null;
            }
        }

        return () => {
            if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
        };
    }, [isAutoFetch, lastProcessedPeriod, lastResultNum]);

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-6 animate-fade-in text-white">
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-wide text-yellow-400">👁️ PRECISION ORACLE</h2>
                <p className="text-xs text-muted-foreground mt-1">AI-Powered Consensus & Memory Pattern Engine</p>
            </div>

            <Card className="p-4 bg-zinc-950 border-zinc-800 space-y-4 shadow-xl">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Next Period (3-digit)</label>
                        <Input
                            type="number"
                            placeholder="Next period"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-center font-mono text-lg"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Current Number</label>
                        <Input
                            type="number"
                            placeholder="Current number"
                            value={resultNum}
                            onChange={(e) => setResultNum(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-center font-mono text-lg"
                        />
                    </div>
                </div>

                <Button
                    onClick={handleManualPredict}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold h-11"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    ANALYZE & PREDICT
                </Button>

                {/* Display Box */}
                <div 
                    className="border border-zinc-800 p-6 rounded-xl text-center relative overflow-hidden transition-all duration-300"
                    style={{
                        borderColor: prediction ? (prediction.final === "Big" ? "#ef4444" : prediction.final === "Small" ? "#22c55e" : "#27272a") : "#27272a",
                        background: 'linear-gradient(180deg, rgba(24,24,27,0.8) 0%, rgba(9,9,11,1) 100%)'
                    }}
                >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">AI Confidence</span>
                    <h3 className={`text-5xl font-black my-2 tracking-wider uppercase ${
                        prediction ? (prediction.final === "Big" ? "text-red-500 animate-pulse" : prediction.final === "Small" ? "text-green-500 animate-pulse" : "text-zinc-500") : "text-zinc-500"
                    }`}>
                        {prediction ? (prediction.final === "Skip" ? "WAIT" : prediction.final) : "---"}
                    </h3>
                    <p className="text-sm font-mono text-zinc-300">
                        {prediction ? (
                            prediction.final === "Skip" ? (
                                "Conflict detected. Skipping."
                            ) : (
                                <>Target ...{String(prediction.targetPeriod).slice(-3)}: <span className="text-yellow-400 font-bold border-b border-yellow-400/40">{prediction.nums.join(", ")}</span></>
                            )
                        ) : "Best Numbers: -"}
                    </p>
                </div>

                {/* Signal Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800/80 p-3 rounded-lg text-center">
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold">Math Signal</span>
                        <span className={`text-lg font-bold ${
                            prediction?.mathSig === 'Big' ? 'text-red-500' : prediction?.mathSig === 'Small' ? 'text-green-500' : 'text-zinc-500'
                        }`}>
                            {prediction ? prediction.mathSig : '-'}
                        </span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800/80 p-3 rounded-lg text-center">
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold">Memory Pattern</span>
                        <span className={`text-lg font-bold ${
                            prediction?.memSig === 'Big' ? 'text-red-500' : prediction?.memSig === 'Small' ? 'text-green-500' : 'text-zinc-500'
                        }`}>
                            {prediction ? prediction.memSig : '-'}
                        </span>
                    </div>
                </div>

                {/* Auto Toggle */}
                <div className="flex justify-center pt-2">
                    <Button 
                        variant="outline" 
                        onClick={toggleAutoFetch} 
                        className={`text-xs h-9 font-bold rounded-full transition-all border-zinc-800 ${
                            isAutoFetch 
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/30' 
                                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                        }`}
                    >
                        {isAutoFetch ? "⛔ STOP AUTO-FETCH" : "🔄 START AUTO-FETCH"}
                    </Button>
                </div>
            </Card>

            {/* Log History */}
            <div className="space-y-2">
                <h4 className="text-xs uppercase font-black text-zinc-400 tracking-wider">Prediction Logs</h4>
                <div className="h-44 overflow-y-auto bg-black border border-zinc-800 rounded-xl p-3 font-mono text-xs space-y-2">
                    {logs.map((log, idx) => (
                        <div key={idx} className="flex justify-between border-b border-zinc-900 pb-1.5 last:border-0">
                            <span className="text-zinc-500">...{String(log.period).slice(-4)}</span>
                            <span className="text-zinc-300 font-bold">{log.pick} vs {log.res}</span>
                            <span className={`font-black ${
                                log.status === 'JACKPOT' ? 'text-yellow-400' : log.status === 'WIN' ? 'text-green-500' : 'text-red-500'
                            }`}>
                                {log.status}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-zinc-700">History Empty</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
