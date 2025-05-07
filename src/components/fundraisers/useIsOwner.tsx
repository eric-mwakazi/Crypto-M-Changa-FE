import { useEffect, useState } from "react";
import { getBalanceAndAddress } from "../../blockchain-services/useCharityDonation";

const OWNER_ADDRESS = "0x7BFF65F1845b69Da42E64B68b64f49411874a22d".toLowerCase();

export default function useIsOwner(): boolean {
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    const checkOwner = async () => {
      try {
        const balanceAndAddress = await getBalanceAndAddress();
        if (!balanceAndAddress) return;
        const { account } = balanceAndAddress;
        if (account.toLowerCase() === OWNER_ADDRESS) {
          setIsOwner(true);
        }
      } catch (err) {
        console.error("Error checking owner:", err);
      }
    };
    checkOwner();
  }, []);

  return isOwner;
}
