import { useEffect } from "react";
import { LoanApplicationButton } from "../../common/LoanApplicationButton";
import OnBoardingStep from "../../common/onboardingStepPopup";
import { ApplicationPage } from "../../constant/redirect";
import BankDetails from "./components/bankDetails";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import BankAccountStatementUpload from "./components/bankStatement";
import { getAccount } from "../../services/api/user-bank-account.api";
import { updateUserBankAccount } from "../../redux/slices/bankAccount";
import FinduitIntegration from "../aa";
import aaBankList from "../../constant/aaBankList.json";
import { getUserConsentRequests } from "../../services/api/aa.api";
import {
  setConsentRequests,
  setLoading,
  setError,
} from "../../redux/slices/aaConsentRequests";
import { AAConsentStatus } from "../../types/aa-consent-request";
import { user_bank_verification_status } from "../../types/user-bank-account";
import PersonalDetails from "../emailVerification/components/personalDetails";

function BankDetailsComponent() {
  const userData = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const userBankAccount = useAppSelector((state) => state.bankAccount);
  const aaConsentRequests = useAppSelector((state) => state.aaConsentRequests);
  const brand = useAppSelector((state) => state.index);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await getAccount(userData.user.userBankAccountId);
        if (response) {
          dispatch(updateUserBankAccount(response));
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    };
    if (userData.user.userBankAccountId) {
      fetchUserDetails();
    }
  }, [userData.user.userBankAccountId, dispatch]);

  useEffect(() => {
    const fetchUserConsentRequests = async () => {
      try {
        dispatch(setLoading(true));
        const response = await getUserConsentRequests(userData.user.id);
        if (response && Array.isArray(response)) {
          dispatch(setConsentRequests(response));
        }
        dispatch(setError(undefined));
      } catch (error) {
        console.error("Failed to fetch user consent requests:", error);
        dispatch(setError("Failed to fetch user consent requests"));
      } finally {
        dispatch(setLoading(false));
      }
    };
    if (userData.user.id) {
      fetchUserConsentRequests();
    }
  }, [userData.user.id, dispatch]);

  const COMMON_WORDS = [
    "bank",
    "ltd",
    "limited",
    "the",
    "and",
    "co",
    "of",
    "corp",
    "corporation",
    "india",
    "national",
    "union",
    "savings",
    "credit",
    "commercial",
    "trust",
    "financial",
    "services",
    "group",
  ];

  // 🧹 Clean & filter common words from string
  const removeCommonWords = (text: string): string | null => {
    const cleaned = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, " ") // remove punctuation
      .split(/\s+/)
      .filter((word) => word && !COMMON_WORDS.includes(word))
      .join(" ")
      .trim();

    return cleaned === "" ? null : cleaned;
  };

  // 🔢 Basic word-level similarity (Jaccard-like)
  const calculateSimilarity = (a: string, b: string): number => {
    if (!a || !b) return 0;
    if (a === b) return 1;

    const aWords = new Set(a.split(/\s+/));
    const bWords = new Set(b.split(/\s+/));
    const intersection = new Set([...aWords].filter((x) => bWords.has(x)));

    return intersection.size / Math.max(aWords.size, bWords.size);
  };

  // 🔍 Exact match check
  const checkExactMatch = (
    cleanedUserBank: string,
    cleanedBankName: string
  ): boolean => {
    return cleanedUserBank === cleanedBankName;
  };

  // 🔍 Substring match check
  const checkSubstringMatch = (
    cleanedUserBank: string,
    cleanedBankName: string
  ): boolean => {
    return (
      cleanedUserBank.includes(cleanedBankName) ||
      cleanedBankName.includes(cleanedUserBank)
    );
  };

  // 🔍 Word similarity check (word-by-word)
  const checkWordSimilarity = (
    userWords: string[],
    bankWords: string[]
  ): boolean => {
    for (const uw of userWords) {
      for (const bw of bankWords) {
        if (uw.length > 2 && bw.length > 2) {
          const sim = calculateSimilarity(uw, bw);
          if (sim >= 0.8) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 🔎 Final matcher function
  const findBankMatch = (userBankName: string) => {
    if (!userBankName) return { found: false, match: null, similarity: 0 };

    const cleanedUserBank = removeCommonWords(userBankName);
    if (!cleanedUserBank) return { found: false, match: null, similarity: 0 };

    const userWords = cleanedUserBank.split(/\s+/);

    let bestMatch = null;
    let highestSimilarity = 0;
    const SIMILARITY_THRESHOLD = 0.7;

    for (const bank of aaBankList.fipList) {
      const cleanedBankName = removeCommonWords(bank.fipName);
      if (!cleanedBankName) continue;

      const bankWords = cleanedBankName.split(/\s+/);

      if (checkExactMatch(cleanedUserBank, cleanedBankName)) {
        return { found: true, match: bank, similarity: 1 };
      }

      let similarity = calculateSimilarity(cleanedUserBank, cleanedBankName);

      if (checkSubstringMatch(cleanedUserBank, cleanedBankName)) {
        similarity = Math.max(similarity, 0.8); // bump similarity
      }

      if (checkWordSimilarity(userWords, bankWords)) {
        similarity = Math.min(1, similarity + 0.2); // cap at 1
      }

      if (
        similarity > highestSimilarity &&
        similarity >= SIMILARITY_THRESHOLD
      ) {
        highestSimilarity = similarity;
        bestMatch = bank;
      }
    }

    return {
      found: highestSimilarity >= SIMILARITY_THRESHOLD,
      match: bestMatch,
      similarity: highestSimilarity,
    };
  };

  const bankMatch = findBankMatch(userBankAccount.bankName || "");
  const isBankInAAList = bankMatch.found;

  // Check if user has tried 5 times and no pending consents
  const checkAAConsentFailureCondition = () => {
    const { consentRequests } = aaConsentRequests;
    //brand.brandConfig.isAA
    if (!brand.brandConfig.isAA) {
      return true;
    }
    // If there are no consent requests, allow AA integration
    if (consentRequests.length === 0) {
      return false;
    }
    // Check if there are any pending consents
    const hasPendingConsent = consentRequests.filter(
      (request) => request.consentStatus === AAConsentStatus.PENDING
    );

    return hasPendingConsent.length > 0;
  };

  const shouldShowBankStatementUpload =
    !isBankInAAList || checkAAConsentFailureCondition();
  return (
    <div className="min-h-[calc(90vh-4rem)] md:min-h-[calc(90vh-6rem)] flex flex-col justify-center">
      <BankDetails />
      <PersonalDetails />
      {userBankAccount.verificationStatus ===
        user_bank_verification_status.VERIFIED && (
        <>
          {shouldShowBankStatementUpload ? (
            <BankAccountStatementUpload />
          ) : (
            <FinduitIntegration />
          )}
        </>
      )}
      <LoanApplicationButton disabled={false} />
      <OnBoardingStep pageKey={ApplicationPage.LoanApplicationBankDetails} />
    </div>
  );
}
export default BankDetailsComponent;
