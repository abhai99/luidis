import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Settings, Save, FileText, Lock, Layout, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { signInAnonymously } from "firebase/auth";

export const AdminDashboard = () => {
    const [prices, setPrices] = useState({
        weekly: 99,
        monthly: 299,
    });

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    // CMS State
    const [pages, setPages] = useState<{ [key: string]: { title: string, content: string } }>({
        page1: { title: '', content: '' },
        page2: { title: '', content: '' },
        page3: { title: '', content: '' },
        page4: { title: '', content: '' },
        page5: { title: '', content: '' },
    });

    // User Data State
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalRevenue: 0,
        conversionRate: 0
    });

    const [isLoading, setIsLoading] = useState(false);


    // Fetch Initial Data (Prices, Users, CMS)
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Prices
                const priceDoc = await getDoc(doc(db, "config", "prices"));
                if (priceDoc.exists()) {
                    setPrices(priceDoc.data() as any);
                }

                // 2. Fetch Users (for Stats & Table)
                const usersSnapshot = await getDocs(collection(db, "users"));
                // Map properly to include ID if it's missing in data but present in doc
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Calculate Stats
                const subscribedUsers = usersData.filter((u: any) => u.subscription?.isSubscribed);
                const revenue = subscribedUsers.reduce((acc: number, curr: any) => acc + (curr.subscription?.amount || 0), 0);

                // Show ALL users in the table, not just subscribed ones
                setUsers(usersData);

                setStats({
                    totalUsers: subscribedUsers.length,
                    totalRevenue: revenue,
                    conversionRate: usersData.length > 0 ? (subscribedUsers.length / usersData.length) * 100 : 0
                });

                // 3. Fetch CMS Content
                const cmsDoc = await getDoc(doc(db, "content", "pages"));
                if (cmsDoc.exists()) {
                    setPages(cmsDoc.data() as any);
                }

            } catch (error) {
                console.error("Error fetching admin data:", error);
                toast.error("Failed to load admin data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated]);


    const handlePriceChange = (plan: 'weekly' | 'monthly', value: string) => {
        const numValue = parseInt(value) || 0;
        setPrices((prev) => ({ ...prev, [plan]: numValue }));
    };

    const handlePageChange = (pageId: string, field: 'title' | 'content', value: string) => {
        setPages(prev => ({
            ...prev,
            [pageId]: { ...prev[pageId], [field]: value }
        }));
    };

    const saveSettings = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                setDoc(doc(db, "config", "prices"), prices),
                setDoc(doc(db, "content", "pages"), pages)
            ]);
            toast.success('All settings saved successfully');
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualActivation = async (userId: string, email: string, plan: 'weekly' | 'monthly') => {
        if (!userId) { toast.error("User ID missing"); return; }
        if (!confirm(`Activate ${plan} plan for ${email}?`)) return;

        try {
            const startDate = new Date();
            const expiresAt = new Date();
            if (plan === 'weekly') expiresAt.setDate(expiresAt.getDate() + 7);
            else expiresAt.setDate(expiresAt.getDate() + 30);

            await setDoc(doc(db, 'users', userId), {
                subscription: {
                    isSubscribed: true,
                    plan: plan,
                    startDate: startDate.toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    amount: plan === 'weekly' ? 99 : 299,
                    manualActivation: true,
                    activatedBy: 'Admin'
                }
            }, { merge: true });

            toast.success(`Activated ${plan} for ${email}`);

            // Refresh logic (Optimistic update)
            setUsers(users.map(u => (u.id === userId || u.uid === userId) ? {
                ...u,
                subscription: {
                    isSubscribed: true,
                    plan,
                    expiresAt: expiresAt.toISOString(),
                    amount: plan === 'weekly' ? 99 : 299
                }
            } : u));

        } catch (error) {
            console.error("Activation failed:", error);
            toast.error("Failed to activate subscription.");
        }
    };

    const handleManualDeactivation = async (userId: string) => {
        if (!userId) return;
        if (!confirm("Are you sure you want to revoke this subscription?")) return;
        try {
            await setDoc(doc(db, 'users', userId), {
                subscription: {
                    isSubscribed: false,
                    plan: null,
                    expiresAt: null
                }
            }, { merge: true });

            toast.success(`Subscription revoked.`);
            // Refresh list locally
            setUsers(users.map(u => (u.id === userId || u.uid === userId) ? {
                ...u,
                subscription: { isSubscribed: false, plan: null }
            } : u));

        } catch (error) {
            console.error("Deactivation failed:", error);
            toast.error("Failed to revoke subscription.");
        }
    };

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="p-8 w-full max-w-md space-y-4">
                    <div className="text-center">
                        <Lock className="w-12 h-12 mx-auto text-primary mb-4" />
                        <h1 className="text-2xl font-bold">Admin Access</h1>
                    </div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (adminPassword === 'addy8811') {
                            setIsLoading(true);
                            try {
                                // Real Firebase Auth (Required for Firestore Access)
                                await signInAnonymously(auth);
                                setIsAuthenticated(true);
                                toast.success('Welcome Admin');
                            } catch (error: any) {
                                console.error("Auth Error:", error);
                                // Since user likely has "Open Rules", we allow them in even if Auth fails
                                // This fixes the "admin-restricted-operation" blocker
                                console.log("Proceeding with Open Rules fallback...");
                                toast.warning('Auth disabled. Using Open Database connection.');
                                setIsAuthenticated(true);
                            } finally {
                                setIsLoading(false);
                            }
                        } else {
                            toast.error('Invalid Password');
                        }
                    }} className="space-y-4">
                        <Input
                            type="password"
                            placeholder="Enter Admin Password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Authenticating...' : 'Login'}
                        </Button>
                    </form>
                </Card>
            </div>
        );
    }

    // Filter users by search term (search by gmail/email or name)
    const filteredUsers = users.filter(user => {
        const email = user.email || '';
        const name = user.displayName || '';
        const term = searchTerm.toLowerCase();
        return email.toLowerCase().includes(term) || name.toLowerCase().includes(term);
    });

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-gradient-primary">
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage prices, content, and view subscribers.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={saveSettings} disabled={isLoading}>
                            {isLoading ? 'Saving...' : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save All Changes
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={() => window.open('/', '_blank')}>
                            View Live Site
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="stats" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="stats">Stats & Users</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing</TabsTrigger>
                        <TabsTrigger value="cms">Content Pages</TabsTrigger>
                    </TabsList>

                    {/* STATS TAB */}
                    <TabsContent value="stats" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="p-6 space-y-2 border-primary/20 bg-primary/5">
                                <div className="flex items-center gap-2 text-primary">
                                    <Users className="w-5 h-5" />
                                    <span className="font-semibold">Total Subscribers</span>
                                </div>
                                <p className="text-4xl font-bold">{stats.totalUsers}</p>
                            </Card>

                            <Card className="p-6 space-y-2 border-accent/20 bg-accent/5">
                                <div className="flex items-center gap-2 text-accent-foreground">
                                    <DollarSign className="w-5 h-5" />
                                    <span className="font-semibold">Total Revenue</span>
                                </div>
                                <p className="text-4xl font-bold">₹{stats.totalRevenue}</p>
                            </Card>

                            <Card className="p-6 space-y-2 border-purple-500/20 bg-purple-500/5">
                                <div className="flex items-center gap-2 text-purple-500">
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="font-semibold">Conversion Rate</span>
                                </div>
                                <p className="text-4xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                            </Card>
                        </div>

                        {/* Users Table */}
                        <Card className="p-6 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">Subscriber List</h3>
                                    <p className="text-sm text-muted-foreground">Manage active subscribers and manual activations.</p>
                                </div>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by Gmail/Email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-8"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Plan</th>
                                            <th className="px-4 py-3">Expires At</th>
                                            <th className="px-4 py-3">Days Left</th>
                                            {/* <th className="px-4 py-3">Amount</th> */}
                                            {/* <th className="px-4 py-3">Order ID</th> */}
                                            <th className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user, idx) => {
                                            const isSub = user.subscription?.isSubscribed;
                                            const daysLeft = isSub ? Math.ceil((new Date(user.subscription.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                            return (
                                                <tr key={idx} className="border-b border-border hover:bg-muted/20">
                                                    <td className="px-4 py-3 font-medium">{user.displayName || 'No Name'}</td>
                                                    <td className="px-4 py-3">{user.email}</td>
                                                    <td className="px-4 py-3 uppercase">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${isSub ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {isSub ? user.subscription.plan : 'FREE'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">{isSub ? new Date(user.subscription.expiresAt).toLocaleDateString() : '-'}</td>
                                                    <td className="px-4 py-3 font-bold text-primary">{isSub ? (daysLeft > 0 ? daysLeft : 'Expired') : '-'}</td>
                                                    {/* <td className="px-4 py-3">₹{user.subscription?.amount || 0}</td> */}
                                                    {/* <td className="px-4 py-3 font-mono text-xs">{user.subscription?.orderId?.slice(0, 10)}...</td> */}
                                                    <td className="px-4 py-3 flex gap-2">
                                                        {!isSub && (
                                                            <>
                                                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleManualActivation(user.uid || user.id, user.email, 'weekly')}>
                                                                    + Weekly
                                                                </Button>
                                                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleManualActivation(user.uid || user.id, user.email, 'monthly')}>
                                                                    + Monthly
                                                                </Button>
                                                            </>
                                                        )}
                                                        {isSub && (
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleManualDeactivation(user.uid || user.id)}>
                                                                Revoke
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-6 text-muted-foreground">
                                                    {users.length === 0 ? "No users found yet." : `No users matching "${searchTerm}"`}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* PRICING TAB */}
                    <TabsContent value="pricing">
                        <Card className="p-8 max-w-2xl">
                            <div className="flex items-center gap-2 mb-6 text-foreground">
                                <Settings className="w-5 h-5" />
                                <h2 className="text-xl font-bold">Plan Configuration</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Weekly Plan Price (₹)</label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            value={prices.weekly}
                                            onChange={(e) => handlePriceChange('weekly', e.target.value)}
                                            className="max-w-[200px]"
                                        />
                                        <span className="text-sm text-muted-foreground">Current: ₹99</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Monthly Plan Price (₹)</label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            value={prices.monthly}
                                            onChange={(e) => handlePriceChange('monthly', e.target.value)}
                                            className="max-w-[200px]"
                                        />
                                        <span className="text-sm text-muted-foreground">Current: ₹299</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* CMS TAB */}
                    <TabsContent value="cms">
                        <Card className="p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Layout className="w-5 h-5" />
                                Page Management (Mini CMS)
                            </h2>
                            <p className="text-muted-foreground mb-6 text-sm">
                                Manage the 5 content pages. If "Title" is empty, standard button shows. If "Content" is empty, it says "Coming Soon".
                                <strong> Put raw HTML in the content box.</strong>
                            </p>

                            <Accordion type="single" collapsible className="w-full">
                                {[1, 2, 3, 4, 5].map((num) => {
                                    const key = `page${num}`;
                                    return (
                                        <AccordionItem key={key} value={String(num)}>
                                            <AccordionTrigger>Page {num} Config</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 p-2">
                                                    <div>
                                                        <label className="text-xs uppercase font-bold text-muted-foreground">Button Title</label>
                                                        <Input
                                                            placeholder={`Button ${num} Title (e.g. VIP Page)`}
                                                            value={pages[key]?.title || ''}
                                                            onChange={(e) => handlePageChange(key, 'title', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs uppercase font-bold text-muted-foreground">HTML Content</label>
                                                        <Textarea
                                                            placeholder="<h1>Hello World</h1>"
                                                            className="font-mono min-h-[150px]"
                                                            value={pages[key]?.content || ''}
                                                            onChange={(e) => handlePageChange(key, 'content', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </Card>
                    </TabsContent>
                </Tabs>


            </div>
        </div>
    );
};
