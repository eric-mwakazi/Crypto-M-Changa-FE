import { useEffect, useState } from "react";
import NavBar from "../navbar/navbar";
import ViewMyCampaigns from "./viewmycampaigns";
import CreateForm from "./createform";
import AdminManagement from "./admin";

import { _contract } from "../../blockchain-services/useCharityDonation";
import { supabase } from "../../supabase/supabaseClient";
import { toast } from "react-toastify";
import { ContractLogsSubscription } from "web3-eth-contract";
import useIsOwner from "./useIsOwner";

export default function MyFundraisers() {
  const [creating, setCreating] = useState<boolean>(false);
  const [viewAdmin, setViewAdmin] = useState<boolean>(false);
  const [viewCreate, setViewCreate] = useState<boolean>(false);
  const [viewCompleted, setViewCompleted] = useState<boolean>(false);
  const [viewCancelled, setViewCancelled] = useState<boolean>(false);
  const [viewActive, setViewActive] = useState<boolean>(true);
  const isOwner = useIsOwner();

  useEffect(() => {
    if (!_contract) return;

    const subscriptions: ContractLogsSubscription[] = [];

    const campaignCreated = _contract.events.CampaignCreated();
    campaignCreated.once("data", async (event) => {
      const storedImage = localStorage.getItem("pendingCampaignImage");
      if (storedImage) {
        setCreating(true);
        try {
          const imageData = JSON.parse(storedImage);
          const _fetch = await fetch(imageData.data);
          const blob = await _fetch.blob();
          const file = new File([blob], imageData.name, { type: imageData.type });

          const campaignId = event.returnValues.campaign_id;
          const campaignAd = event.returnValues.campaignAddress;
          const fileExt = file.name.split(".").pop();
          const fileName = `${campaignAd}_${campaignId}.${fileExt}`;

          const { error } = await supabase.storage.from("undugu").upload(fileName, file);
          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage.from("undugu").getPublicUrl(fileName);

          const { error: dbError } = await supabase.from("unduguimages").insert([
            {
              fraddress: campaignAd?.toString(),
              frid: Number(campaignId),
              url: publicUrl,
            },
          ]);
          if (dbError) throw dbError;

          localStorage.removeItem("pendingCampaignImage");
          setCreating(false);
          toast.success(`'${event.returnValues.title}' Fundraiser Was Created Successfully!`);
        } catch (error) {
          console.log("Failed To Upload Image: ", error);
          setCreating(false);
        }
      }
    });
    campaignCreated.on("error", console.error);
    subscriptions.push(campaignCreated);

    const addAdmin = _contract.events.AddAdmin();
    addAdmin.once("data", (event) => {

      const admin = event.returnValues.admin as string;
      toast.success(`Added ${admin.slice(0,6)}...${admin.slice(-4)} As Fundraiser Admin`);

    });
    addAdmin.on("error", console.error);
    subscriptions.push(addAdmin);

    const removeAdmin = _contract.events.RemoveAdmin();
    removeAdmin.once("data", (event) => {
      const admin = event.returnValues.admin as string;
      toast.success(`Removed ${admin?.slice(0, 6)}...${admin?.slice(-4)} As Fundraiser Admin`);
    });
    removeAdmin.on("error", console.error);
    subscriptions.push(removeAdmin);

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [_contract]);

  const manageView = (view: number) => {
    setViewCancelled(false);
    setViewCompleted(false);
    setViewCreate(false);
    setViewAdmin(false);
    setViewActive(false);

    switch (view) {
      case 1:
        setViewCancelled(true);
        break;
      case 2:
        setViewCompleted(true);
        break;
      case 3:
        setViewCreate(true);
        break;
      case 4:
        setViewAdmin(true);
        break;
      case 5:
        setViewActive(true);
        break;
      default:
        setViewActive(true);
    }
  };

  return (
    <div>
      <NavBar />
      <div className="sticky top-16 backdrop-blur-md darK:bg-black/20 bg-black/10 z-40 w-full">
        <div className="flex justify-center items-center p-2">
          <div className="flex justify-evenly w-full md:w-1/2 p-1">
            <div
              onClick={() => manageView(1)}
              className={`font-bold text-green-600 hover:cursor-pointer ${viewCancelled ? "border-b-green-700 border-b-2" : ""}`}
            >
              Cancelled
            </div>
            <div
              onClick={() => manageView(2)}
              className={`font-bold text-green-600 hover:cursor-pointer ${viewCompleted ? "border-b-green-700 border-b-2" : ""}`}
            >
              Completed
            </div>
            <div
              onClick={() => manageView(5)}
              className={`font-bold text-green-600 hover:cursor-pointer ${viewActive ? "border-b-green-700 border-b-2" : ""}`}
            >
              Active
            </div>
            <div
              onClick={() => manageView(3)}
              className={`font-bold text-green-600 hover:cursor-pointer ${viewCreate ? "border-b-green-700 border-b-2" : ""}`}
            >
              Create
            </div>
            {isOwner && (
              <div
                onClick={() => manageView(4)}
                className={`font-bold text-green-600 hover:cursor-pointer ${viewAdmin ? "border-b-green-700 border-b-2" : ""}`}
              >
                Admins
              </div>
            )}
          </div>
        </div>
      </div>

      {viewCreate && (
        <>
          {creating ? (
            <div className="w-full bg-green-400 bg-opacity-60 h-dvh grid place-items-center">
              <div className="flex justify-center items-center flex-col p-1 bg-black bg-opacity-50 rounded-xl">
                <span className="text-lg font-mono">Working on your fundraiser</span>
                <span className="loading loading-infinity loading-lg"></span>
              </div>
            </div>
          ) : (
            <CreateForm />
          )}
        </>
      )}

      {viewAdmin && isOwner && <AdminManagement />}
      {viewActive && <ViewMyCampaigns status="Active" />}
      {viewCompleted && <ViewMyCampaigns status="Completed" />}
      {viewCancelled && <ViewMyCampaigns status="Cancelled" />}
    </div>
  );
}
