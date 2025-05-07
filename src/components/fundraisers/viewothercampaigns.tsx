// viewothercampigns.tsx

import { CampaignDataArgs, CombinedCampaignData, SerializedCampaignData } from "../../types"
import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { supabase } from "../../supabase/supabaseClient"
import { useCookies } from "react-cookie"
import { _web3, getBalanceAndAddress, viewCampaignDetails, isActiveAdmin } from "../../blockchain-services/useCharityDonation";

export default function ViewOtherCampaigns() {
    const [combined, setCombined] = useState<CombinedCampaignData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();
    const [, setAdmin] = useState(false);
    const [cookies, setCookie] = useCookies([`other_campaigns`])

    const handleRedirect = (id: string, address: string) => {
        navigate(`/campaign-details?address=${address}&id=${id}`);
    }

    // Memoized search filter
    const filteredCampaigns = useMemo(() => {
        if (!searchQuery.trim()) return combined;
        
        const query = searchQuery.toLowerCase();
        return combined.filter(campaign => 
            campaign.title.toLowerCase().includes(query) ||
            campaign.campaignAddress.toString().toLowerCase().includes(query)
        );
    }, [combined, searchQuery]);

    // Convert CombinedCampaignData to serialized form for cookie
    const serializeCampaignData = (data: CombinedCampaignData[]): SerializedCampaignData[] => {
        return data.map(campaign => ({
            campaign_id: campaign.campaign_id.toString(),
            title: campaign.title,
            description: campaign.description,
            campaignAddress: campaign.campaignAddress,
            targetAmount: campaign.targetAmount.toString(),
            raisedAmount: campaign.raisedAmount.toString(),
            balance: campaign.balance.toString(),
            deadline: campaign.deadline.toString(),
            isCompleted: campaign.isCompleted,
            isCancelled: campaign.isCancelled,
            imageUrl: campaign.imageUrl,
            endDate: campaign.endDate,
            progress: campaign.progress,
        }));
    };

    // Convert serialized data back to CombinedCampaignData
    const deserializeCampaignData = (data: SerializedCampaignData[]): CombinedCampaignData[] => {
        return data.map(campaign => ({
            campaign_id: BigInt(campaign.campaign_id),
            title: campaign.title,
            description: campaign.description,
            campaignAddress: campaign.campaignAddress,
            targetAmount: BigInt(campaign.targetAmount),
            raisedAmount: BigInt(campaign.raisedAmount),
            balance: BigInt(campaign.balance),
            deadline: BigInt(campaign.deadline),
            isCompleted: campaign.isCompleted,
            isCancelled: campaign.isCancelled,
            imageUrl: campaign.imageUrl,
            endDate: campaign.endDate,
            progress: campaign.progress,
        }));
    };
    
    const checkIfAdmin = async (): Promise<boolean> => {
        try {
            const balanceAndAddress = await getBalanceAndAddress();
            if (!balanceAndAddress) throw new Error("Failed to get balance and address");
    
            const { account } = balanceAndAddress;
            const address = "0x7BFF65F1845b69Da42E64B68b64f49411874a22d";
    
            const isAdmin = await isActiveAdmin(account, address);
            setAdmin(isAdmin); // still store in state if needed
            return isAdmin;
        } catch (err) {
            console.error("Admin check failed:", err);
            return false; // assume non-admin on error
        }
    };
    
    const fetchAllData = async (isAdmin: boolean) => {
        try {
            setIsLoading(true);
            
            const { data: imageData, error: imageError } = await supabase
                .from('unduguimages')
                .select('*');
    
            if (imageError) throw new Error(`Error fetching images: ${imageError.message}`);
    
            const combinedData = await Promise.all(
                imageData.map(async (campaign) => {
                    try {
                        const thisCampaign = await viewCampaignDetails(campaign.frid, campaign.fraddress);
                        const { details } = thisCampaign as { details: CampaignDataArgs };
                        const deadline = new Date(Number(details.deadline) * 1000).toLocaleDateString();
                        const progress = Math.round(
                            Number(details.raisedAmount * BigInt(100) / details.targetAmount)
                        );
    
                        return {
                            ...details,
                            imageUrl: campaign?.url || null,
                            endDate: deadline,
                            progress: progress.toString()
                        };
                    } catch (error) {
                        console.error(`Error fetching campaign ${campaign.frid}:`, error);
                        return null;
                    }
                })
            );
    
            const filteredData = combinedData
                .filter((campaign): campaign is CombinedCampaignData => {
                    if (!campaign) return false;
                    if (!isAdmin) {
                        return !campaign.isCompleted && !campaign.isCancelled;
                    }
                    return true;
                });
    
            setCombined(filteredData);
            setCookie(`other_campaigns`, serializeCampaignData(filteredData), {
                path: '/fundraisers',
                maxAge: 3600,
                secure: true,
                sameSite: 'strict'
            });
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load campaigns");
        } finally {
            setIsLoading(false);
        }
    };
    

    useEffect(() => {
        const init = async () => {
            const cookieData = cookies[`other_campaigns`];
            if (cookieData) {
                console.log(`other-campaigns: ${cookieData}`);
                setCombined(deserializeCampaignData(cookieData));
            }
    
            const isAdmin = await checkIfAdmin(); // ✅ Wait for admin check
            await fetchAllData(isAdmin);          // ✅ Pass result into data fetch
        };
    
        init();
    }, []);
    

    if (isLoading) {
        return (
            <div className="p-5 grid place-items-center h-screen">
                <div className="text-green-600 flex flex-col justify-center items-center">
                    <span className="text-xl font-semibold">Loading Fundraisers</span>
                    <span className="loading loading-infinity loading-lg"></span>
                </div>
            </div>
        );
    }

    if (combined.length === 0) {
        return (
            <div className="p-5 grid place-items-center h-screen">
                <div className="text-green-600 flex flex-col justify-center items-center">
                    <span className="text-xl">There No Active Fundraisers Yet!</span>
                    <span>......</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Search Input */}
            <div className="sticky top-16 backdrop-blur-md bg-black/20 z-40 w-full">
                <div className="w-full p-2 grid place-items-center">
                    <input
                        type="text"
                        placeholder="Search fundraisers by title or address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input input-bordered w-full md:w-1/2 border-green-500 dark:border-green-800"
                    />
                </div>
            </div>
    
            {/* Campaign Cards */}
            <div className="m-1 p-1 flex flex-wrap justify-center items-center">
                {filteredCampaigns.map(campaign => (
                    <div 
                        key={`${campaign.campaignAddress}-${campaign.campaign_id}`}
                        onClick={() => handleRedirect(
                            campaign.campaign_id.toString(),
                            campaign.campaignAddress.toString()
                        )} 
                        className="card card-compact bg-white/10 overflow-hidden md:w-1/4 w-full md:h-1/2 shadow-lg hover:cursor-pointer m-2 border border-green-200 dark:border-gray-500 hover:border-green-500 transition duration-300"
                    >
                        <figure className="max-h-60">
                            <img
                                src={campaign.imageUrl || ''}
                                alt={campaign.title} 
                                className="w-full h-full object-cover"
                            />
                        </figure>
                        <div className="card-body">
                            <h2 className="text-xl font-semibold w-full line-clamp-2">
                                {campaign.title}
                            </h2>
                            <p className="line-clamp-2 w-full text-base">
                                {campaign.description}
                            </p>
                            <div className="flex justify-between">
                                <p className="text-center">
                                    <span className="font-semibold text-base">Goal: </span>
                                    <span className="font-mono">
                                        {_web3.utils.fromWei(campaign.targetAmount, 'ether')}
                                    </span> ETH
                                </p>
                                <p className="text-center">
                                    <span className="font-semibold text-base">Raised: </span>
                                    <span className="font-mono">
                                        {_web3.utils.fromWei(campaign.raisedAmount, 'ether')}
                                    </span> ETH
                                </p>
                            </div>
                            <div>
                                <progress 
                                    className="progress progress-success w-full" 
                                    value={campaign.progress} 
                                    max="100"
                                />
                            </div>                                    
                        </div>
                    </div>
                ))}
            </div>

            {/* No Results Message */}
            {filteredCampaigns.length === 0 && searchQuery && (
                <div className="text-green-600 p-2 m-2 text-center">
                    <p className="text-lg">No fundraisers found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
}