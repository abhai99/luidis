import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const LiveMinuteCalculation = () => {
    const [userNumber, setUserNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{
        finalDigit: number;
        outcome: string;
    } | null>(null);

    const handleCalculate = async () => {
        const inputNum = parseInt(userNumber);
        if (isNaN(inputNum) || inputNum < 0 || inputNum > 9) {
            toast.error("Please enter a single digit number (0-9).");
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            // Emulate the 1.5-second animation delay from the original script
            const [response] = await Promise.all([
                fetch(`/api/predict?page=2&number=${inputNum}`),
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);

            if (!response.ok) throw new Error('API failed');
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            setResult({
                finalDigit: data.finalDigit,
                outcome: data.outcome
            });

        } catch (error) {
            toast.error('Failed to compute calculation.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-6 animate-fade-in text-white">
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-wide text-orange-500">⏰ Live Minute Calculation</h2>
                <p className="text-xs text-muted-foreground mt-1">Algorithmic alignment with system minutes</p>
            </div>

            <Card className="p-6 bg-zinc-950 border-zinc-800 space-y-6 shadow-xl text-center">
                <div className="space-y-4 max-w-[240px] mx-auto">
                    <label className="text-xs text-zinc-400 font-medium block">Enter any digit (0-9)</label>
                    <div className="flex gap-2 justify-center">
                        <Input
                            type="number"
                            min={0}
                            max={9}
                            placeholder="0-9"
                            value={userNumber}
                            onChange={(e) => setUserNumber(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-center font-bold text-2xl h-14 w-24"
                        />
                        <Button 
                            onClick={handleCalculate}
                            disabled={isLoading}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-14 px-6 text-sm"
                        >
                            Calculate
                        </Button>
                    </div>
                </div>

                {/* Display Output / Loading */}
                <div className="border-t border-zinc-900 pt-6 min-h-[140px] flex flex-col items-center justify-center">
                    {isLoading && (
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl animate-spin inline-block">🌀</span>
                            <span className="text-xs text-zinc-500 font-mono">Running minute alignment...</span>
                        </div>
                    )}

                    {result && (
                        <div className="animate-slide-up flex items-center justify-center gap-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white ${
                                result.outcome === 'BIG' ? 'bg-red-500' : 'bg-green-500'
                            }`}>
                                {result.finalDigit}
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wide">Prediction</span>
                                <h3 className={`text-4xl font-black ${
                                    result.outcome === 'BIG' ? 'text-red-500' : 'text-green-500'
                                }`}>
                                    {result.outcome}
                                </h3>
                            </div>
                        </div>
                    )}

                    {!isLoading && !result && (
                        <p className="text-zinc-600 text-sm italic">Input a digit and calculate to begin.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};
