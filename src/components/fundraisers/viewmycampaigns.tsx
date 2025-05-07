import { CampaignDataArgs, CombinedCampaignDataX, SerializedCampaignDataX } from "../../types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { _web3 } from "../../blockchain-services/useCharityDonation";
import { getBalanceAndAddress, myCampaigns, viewCampaignDetails, isActiveAdmin } from "../../blockchain-services/useCharityDonation";
import { toast } from "react-toastify";
import { supabase } from "../../supabase/supabaseClient";
import { useCookies } from "react-cookie";
import React from "react";

export default function ViewMyCampaigns({ status }: { status: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [combined, setCombined] = useState<CombinedCampaignDataX[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [cookies, setCookie] = useCookies(["Active", "Completed", "Cancelled"]);

    const navigate = useNavigate();

    const handleRedirect = (id: string, address: string) => {
        navigate(`/campaign-details?address=${address}&id=${id}`);
    }

    const filterCampaigns = useMemo(() => (campaigns: CampaignDataArgs[]): CampaignDataArgs[] => {
        // ... (your filterCampaigns logic)
        console.log(`Filtering owned campaigns for status: ${status}`, campaigns);
        switch (status) {
            case 'Active':
                return campaigns.filter(campaign => !campaign.isCompleted && !campaign.isCancelled);
            case 'Completed':
                return campaigns.filter(campaign => campaign.isCompleted);
            case 'Cancelled':
                return campaigns.filter(campaign => campaign.isCancelled);
            default:
                return campaigns;
        }
    }, [status]);

    const filterCampaignsAdmin = useMemo(() => (campaigns: CombinedCampaignDataX[]): CombinedCampaignDataX[] => {
        // ... (your filterCampaignsAdmin logic)
        console.log(`Filtering admin campaigns for status: ${status}`, campaigns);
        switch (status) {
            case 'Active':
                return campaigns.filter(campaign => !campaign.isCompleted && !campaign.isCancelled);
            case 'Completed':
                return campaigns.filter(campaign => campaign.isCompleted);
            case 'Cancelled':
                return campaigns.filter(campaign => campaign.isCancelled);
            default:
                return campaigns;
        }
    }, [status]);

    const filteredCampaigns = useMemo(() => {
        if (!searchQuery.trim()) return combined;
        const query = searchQuery.toLowerCase();
        return combined.filter(campaign =>
            campaign.title.toLowerCase().includes(query) ||
            campaign.campaignAddress.toString().toLowerCase().includes(query)
        );
    }, [combined, searchQuery]);

    const serializeCampaignData = (data: CombinedCampaignDataX[]): SerializedCampaignDataX[] => {
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
            campaignKey: campaign.campaignKey
        }));
    };

    const deserializeCampaignData = (data: SerializedCampaignDataX[]): CombinedCampaignDataX[] => {
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
            campaignKey: campaign.campaignKey
        }));
    };
    const fetchAllData = useCallback(async () => {
        try {
            setIsLoading(true);
            const balanceAndAddress = await getBalanceAndAddress();
            if (!balanceAndAddress) throw new Error('Failed to get balance and address');
            const { account } = balanceAndAddress;
    
            // Step 1: Fetch all image data once
            const { data: allImageData, error: imageError } = await supabase
                .from('unduguimages')
                .select('*');
            if (imageError) throw new Error(`Error fetching images: ${imageError.message}`);
    
            // Step 2: Fetch owned campaigns
            const [ownedCampaignsRaw] = await Promise.all([myCampaigns()]);
            const filteredOwnedCampaigns = filterCampaigns(ownedCampaignsRaw);
    
            const ownedCampaignsWithImage = filteredOwnedCampaigns.map((campaign) => {
                const image = allImageData?.find(img =>
                    img.frid === String(campaign.campaign_id) &&  // ✅ Convert to string
                    img.fraddress.toLowerCase() === campaign.campaignAddress.toLowerCase()
                );                
    
                const deadline = new Date(Number(campaign.deadline) * 1000).toLocaleDateString();
                const progress = Math.round(
                    Number(campaign.raisedAmount * BigInt(100) / campaign.targetAmount)
                );
    
                return {
                    ...campaign,
                    imageUrl: image?.url ?? null,
                    endDate: deadline,
                    progress: progress.toString(),
                    campaignKey: `${campaign.campaignAddress}-${campaign.campaign_id}`
                };
            });
    
            // Step 3: Admin campaigns
            const adminCampaignsPromises = allImageData?.map(async (campaign) => {
                try {
                    const amAnAdmin = await isActiveAdmin(account, campaign.fraddress);
                    if (!amAnAdmin) return null;
    
                    const thisCampaign = await viewCampaignDetails(campaign.frid, campaign.fraddress);
                    const { details } = thisCampaign as { details: CampaignDataArgs };
                    const deadline = new Date(Number(details.deadline) * 1000).toLocaleDateString();
                    const progress = Math.round(
                        Number(details.raisedAmount * BigInt(100) / details.targetAmount)
                    );
    
                    return {
                        ...details,
                        imageUrl: campaign?.url ?? null,
                        endDate: deadline,
                        progress: progress.toString(),
                        campaignKey: `${details.campaignAddress}-${details.campaign_id}`
                    };
                } catch (error) {
                    console.error(`Error fetching admin campaign ${campaign.frid}:`, error);
                    return null;
                }
            }) || [];
    
            const adminCampaigns = (await Promise.all(adminCampaignsPromises))
                .filter((c): c is CombinedCampaignDataX => c !== null && c !== undefined);
    
            const filteredAdminCampaigns = filterCampaignsAdmin(adminCampaigns);
    
            // Step 4: Merge uniquely
            const campaignMap = new Map<string, CombinedCampaignDataX>();
            ownedCampaignsWithImage.forEach(c => campaignMap.set(c.campaignKey, c));
            filteredAdminCampaigns.forEach(c => {
                if (!campaignMap.has(c.campaignKey)) campaignMap.set(c.campaignKey, c);
            });
    
            const mergedCampaigns = Array.from(campaignMap.values());
            setCombined(mergedCampaigns);
    
            // Step 5: Cache in cookie
            const cookieName = status as "Active" | "Completed" | "Cancelled";
            const serialized = serializeCampaignData(mergedCampaigns);
            setCookie(cookieName, serialized, {
                path: '/my-fundraisers',
                maxAge: 3600,
                secure: true,
                sameSite: 'strict'
            });
    
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            toast.error('Failed to load campaigns');
        } finally {
            setIsLoading(false);
        }
    }, [filterCampaigns, filterCampaignsAdmin, setCookie, status]);
    
    

    useEffect(() => {
        const cookieName = status as "Active" | "Completed" | "Cancelled";
        const cookieData = cookies[cookieName];
        if (cookieData) {
            console.log(`Retrieved cookie '${cookieName}':`, cookieData);
            setCombined(deserializeCampaignData(cookieData));
            console.log("Cookies on mount:", cookies);
            console.log("Deserialized cookie data:", deserializeCampaignData(cookieData));

        } else {
            console.log(`No cookie found for status: ${status}`);
            fetchAllData(); // safe now
        }
    }, [status, cookies.Active, cookies.Completed, cookies.Cancelled, fetchAllData]);
    

    if (isLoading) {
        return (
            <div className="text-green-600 p-2 m-2 h-1/3 grid place-items-center">
                <p className="p-1 text-lg font-semibold mt-10 text-center">
                    Loading {status} Fundraisers...
                </p>
                <span className="loading loading-dots loading-lg"></span>
            </div>
        );
    }

    if (!combined.length) {
        return (
            <div className="text-green-600 p-2 m-2 h-1/3 grid place-items-center">
                <p className="p-1 text-lg font-semibold mt-10 text-center">
                    You Have No {status} Fundraisers Yet!
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Search Input */}
            <div className="w-full sticky top-16 z-30">
                <div className="w-full p-2 mt-2 grid place-items-center">
                    <input
                        type="text"
                        placeholder="Search campaigns by title or address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input input-bordered w-full md:w-1/2 shadow-xl border-green-500"
                    />
                </div>
            </div>

            {/* Campaign Cards */}
            <div className="m-1 p-1 flex flex-wrap justify-center items-center">
                {filteredCampaigns.map(campaign => (
                    <React.Fragment key={campaign.campaignKey}>
                        {campaign.imageUrl && (
                            <div
                                className="card card-compact bg-white/10  overflow-hidden md:w-1/4 w-full md:h-1/2 shadow-lg m-2 border border-green-200 dark:border-gray-500 hover:border-green-500 transition duration-300 hover:cursor-pointer"
                                onClick={() => handleRedirect(
                                    campaign.campaign_id.toString(),
                                    campaign.campaignAddress.toString()
                                )}
                            >
                                <figure className="max-h-60">
                                    <img
                                        src={campaign.imageUrl}
                                        alt={campaign.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
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
                                            <span className="font-semibold text-base">Target: </span>
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
                                    <p className="text-center">
                                        <span className="font-semibold text-base">Deadline: </span>
                                        <span>{campaign.endDate}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* No Results Message */}
            {filteredCampaigns.length === 0 && searchQuery && (
                <div className="text-green-600 p-2 m-2 text-center">
                    <p className="text-lg">No campaigns found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
}