"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, IdCard, UserRound } from "lucide-react";
import QRCode from "qrcode";
import type { IdCardFieldSetting, IdCardSignatureSetting, PublicSiteOverview } from "@mms/shared";
import { useMemberEndpoint, type MemberProfileData, type MemberRegistrationData } from "@/components/member/member-data";
import { Button } from "@/components/ui/button";
import { downloadIdCardPdf } from "@/lib/id-card-pdf";
import { fetchPublicSite } from "@/services/public-site";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function mediaUrl(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const file = value as { fileName?: string; fileUrl?: string };
    return file.fileName ?? file.fileUrl ?? null;
  }
  return String(value);
}

function normalized(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findRegistrationValue(data: MemberRegistrationData | null, names: string[]) {
  const fields = data?.sections.flatMap((section) => section.fields) ?? [];
  const match = fields.find((field) => {
    const key = normalized(field.key);
    const label = normalized(field.label);
    return names.some((name) => key.includes(name) || label.includes(name));
  });
  return match ? displayValue(match.value) : null;
}

function defaultIdCardSignatures(): IdCardSignatureSetting[] {
  return [
    {
      key: "president",
      label: "President",
      name: "President",
      signatureType: "text",
      text: "Demo Sign",
      imageUrl: null,
      showOnCard: true
    },
    {
      key: "secretary",
      label: "Secretary",
      name: "Secretary",
      signatureType: "text",
      text: "Demo Sign",
      imageUrl: null,
      showOnCard: true
    }
  ];
}

function idCardSignatures(site: PublicSiteOverview | null) {
  const current = site?.website.idCardSignatures ?? [];
  return defaultIdCardSignatures().map((fallback) => {
    const signature = current.find((item) => item.key === fallback.key) ?? fallback;
    return {
      ...signature,
      imageUrl: mediaUrl(signature.imageUrl)
    };
  });
}

function defaultIdCardFields(): IdCardFieldSetting[] {
  return [
    { key: "photo", label: "Member photo", showOnCard: true },
    { key: "memberName", label: "Member name", showOnCard: true },
    { key: "memberId", label: "Member ID", showOnCard: true },
    { key: "bloodGroup", label: "Blood group", showOnCard: true },
    { key: "phone", label: "Phone", showOnCard: true },
    { key: "address", label: "Address", showOnCard: true },
    { key: "qrCode", label: "QR verification code", showOnCard: true },
    { key: "approvedSeal", label: "Approved member seal", showOnCard: true },
    { key: "organizationAddress", label: "Organization address", showOnCard: true },
    { key: "returnNotice", label: "Return notice", showOnCard: true },
    { key: "signatures", label: "Signatures", showOnCard: true }
  ];
}

function idCardFields(site: PublicSiteOverview | null) {
  const current = site?.website.idCardFields ?? [];
  return Object.fromEntries(
    defaultIdCardFields().map((fallback) => {
      const field = current.find((item) => item.key === fallback.key) ?? fallback;
      return [fallback.key, field.showOnCard];
    })
  ) as Record<string, boolean>;
}

function SignaturePreview({ signature }: { signature: IdCardSignatureSetting }) {
  if (signature.signatureType === "image" && signature.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={signature.imageUrl} alt="" className="id-card-signature-image" />
    );
  }
  return <div className="id-card-signature-text">{signature.text || signature.name || signature.label}</div>;
}

export default function IdCardPage() {
  const profile = useMemberEndpoint<MemberProfileData>("/member/profile");
  const registration = useMemberEndpoint<MemberRegistrationData>("/member/registration-data");
  const [site, setSite] = useState<PublicSiteOverview | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicSite()
      .then((value) => {
        if (!cancelled) setSite(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const bloodGroup = useMemo(
    () => findRegistrationValue(registration.data, ["blood", "bloodgroup"]),
    [registration.data]
  );
  const address = useMemo(
    () => findRegistrationValue(registration.data, ["address", "presentaddress", "permanentaddress", "mailingaddress"]),
    [registration.data]
  );
  const dateOfBirth = useMemo(
    () => findRegistrationValue(registration.data, ["dob", "dateofbirth", "birthdate"]),
    [registration.data]
  );
  const qrText = useMemo(() => {
    if (!profile.data) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/member/id-card?member=${encodeURIComponent(profile.data.memberId ?? profile.data.id)}`;
  }, [profile.data]);

  useEffect(() => {
    let cancelled = false;
    if (!qrText) {
      setQrDataUrl(null);
      return () => {
        cancelled = true;
      };
    }
    QRCode.toDataURL(qrText, { margin: 1, width: 160, color: { dark: "#25201c", light: "#ffffff" } })
      .then((value) => {
        if (!cancelled) setQrDataUrl(value);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [qrText]);

  if (profile.error || registration.error) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load ID card data.</div>;
  }
  if (!profile.data || !registration.data) {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Generating ID card...</div>;
  }

  const member = profile.data;
  const organizationName = site?.organization.name ?? site?.website.siteTitle ?? "Sociology Alumni Association of SUST";
  const organizationAddress = site?.organization.address ?? "Shahjalal University of Science and Technology, Sylhet";
  const logo = mediaUrl(site?.website.logoUrl);
  const photo = mediaUrl(member.photo);
  const signatures = idCardSignatures(site);
  const fields = idCardFields(site);
  const missing = [
    fields.photo && !member.photo ? "photo" : null,
    fields.bloodGroup && !bloodGroup ? "blood group" : null,
    fields.address && !address ? "address" : null
  ].filter(Boolean);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadIdCardPdf({
        organizationName,
        organizationAddress,
        organizationSlogan: "Member ID Card",
        logoUrl: logo,
        photoUrl: photo,
        memberName: member.fullName,
        designation: member.membershipType?.name ?? "Member",
        memberId: member.memberId ?? "Pending",
        dateOfBirth,
        phone: member.phone,
        email: member.email,
        bloodGroup,
        address,
        joinedAt: member.joinedAt,
        expiresAt: member.expiredAt,
        signatures,
        fields,
        qrText
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @page {
          size: 85.6mm 54mm;
          margin: 0;
        }
        .id-card-preview-grid {
          display: grid;
          gap: 24px;
        }
        @media (min-width: 1280px) {
          .id-card-preview-grid {
            grid-template-columns: repeat(2, max-content);
            align-items: start;
          }
        }
        .id-card-panel {
          overflow-x: auto;
        }
        .id-card-side-label {
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: 700;
          color: #6f6258;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .official-id-card {
          position: relative;
          box-sizing: border-box;
          width: 85.6mm;
          height: 54mm;
          overflow: hidden;
          border: 0.35mm solid #eadfd6;
          border-radius: 2.6mm;
          background: #ffffff;
          color: #25201c;
          font-family: Arial, Inter, Poppins, sans-serif;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .official-id-card * {
          box-sizing: border-box;
        }
        .official-id-card__header {
          height: 12.5mm;
          display: grid;
          grid-template-columns: 10mm 1fr;
          gap: 2.4mm;
          align-items: center;
          padding: 2mm 3mm;
          background: linear-gradient(135deg, #d9471f 0%, #f05a28 58%, #f28a54 100%);
          color: #ffffff;
        }
        .official-id-card__logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 8.4mm;
          height: 8.4mm;
          border: 0.25mm solid rgba(255, 255, 255, 0.72);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.94);
          color: #f05a28;
        }
        .official-id-card__logo img,
        .official-id-card__watermark img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .official-id-card__kicker {
          margin: 0;
          font-size: 2.05mm;
          font-weight: 700;
          letter-spacing: 0.32mm;
          text-transform: uppercase;
          opacity: 0.82;
          line-height: 1.1;
        }
        .official-id-card__org {
          margin: 0.6mm 0 0;
          max-height: 5.4mm;
          overflow: hidden;
          font-size: 3mm;
          font-weight: 800;
          line-height: 1.12;
          word-break: break-word;
        }
        .official-id-card__front-body {
          display: grid;
          grid-template-columns: 24mm 1fr;
          gap: 3mm;
          padding: 3mm 3.2mm 1.8mm;
        }
        .official-id-card__front-body--no-photo {
          grid-template-columns: 1fr;
        }
        .official-id-card__photo-wrap {
          position: relative;
          width: 21mm;
        }
        .official-id-card__photo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 21mm;
          height: 25mm;
          overflow: hidden;
          border: 0.45mm solid #ffffff;
          outline: 0.25mm solid #eadfd6;
          border-radius: 2mm;
          background: #fff8ef;
          color: #f05a28;
        }
        .official-id-card__photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .official-id-card__verified {
          position: absolute;
          right: -1.7mm;
          bottom: -1.7mm;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 6.2mm;
          height: 6.2mm;
          border: 0.45mm solid #ffffff;
          border-radius: 50%;
          background: #168a5f;
          color: #ffffff;
          font-size: 3.2mm;
          font-weight: 800;
          line-height: 1;
        }
        .official-id-card__details {
          min-width: 0;
          padding-top: 0.3mm;
        }
        .official-id-card__name {
          margin: 0;
          max-height: 8.5mm;
          overflow: hidden;
          font-size: 4mm;
          font-weight: 800;
          line-height: 1.05;
          word-break: break-word;
        }
        .official-id-card__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 1.3mm;
          margin-top: 1.8mm;
        }
        .official-id-card__badge {
          display: inline-flex;
          align-items: center;
          min-height: 4.5mm;
          max-width: 100%;
          border-radius: 99mm;
          padding: 0.6mm 1.8mm;
          background: #fff1e9;
          color: #bf421f;
          font-size: 2.2mm;
          font-weight: 800;
          line-height: 1;
          word-break: break-word;
        }
        .official-id-card__badge--blood {
          background: #fff0f0;
          color: #c1121f;
        }
        .official-id-card__info {
          display: grid;
          gap: 1.15mm;
          margin-top: 2mm;
        }
        .official-id-card__row {
          display: grid;
          grid-template-columns: 13mm 1fr;
          gap: 1.5mm;
          min-width: 0;
          font-size: 2.35mm;
          line-height: 1.2;
        }
        .official-id-card__row span:first-child {
          color: #7a6a5e;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08mm;
        }
        .official-id-card__row span:last-child {
          min-width: 0;
          overflow: hidden;
          color: #25201c;
          font-weight: 700;
          word-break: break-word;
        }
        .official-id-card__address {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .official-id-card__footer {
          position: absolute;
          left: 3.2mm;
          right: 3.2mm;
          bottom: 2.2mm;
          display: grid;
          grid-template-columns: 16mm 1fr 22mm;
          gap: 2.5mm;
          align-items: end;
        }
        .official-id-card__footer--compact {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .official-id-card__qr {
          display: grid;
          gap: 0.7mm;
          justify-items: center;
          color: #7a6a5e;
          font-size: 1.8mm;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08mm;
        }
        .official-id-card__qr-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 12mm;
          height: 12mm;
          border: 0.25mm solid #eadfd6;
          border-radius: 1.2mm;
          background: #ffffff;
        }
        .official-id-card__qr-box img {
          width: 10.7mm;
          height: 10.7mm;
        }
        .official-id-card__seal {
          align-self: center;
          justify-self: center;
          border: 0.28mm solid #f3c5ad;
          border-radius: 50%;
          padding: 1.3mm 1.8mm;
          color: #d9471f;
          font-size: 1.8mm;
          font-weight: 800;
          line-height: 1.15;
          text-align: center;
          text-transform: uppercase;
        }
        .official-id-card__sign-mini {
          text-align: center;
        }
        .official-id-card__sign-mini .id-card-signature-text {
          font-size: 3.2mm;
        }
        .official-id-card__sign-mini .id-card-signature-image {
          height: 5.2mm;
          max-width: 18mm;
        }
        .official-id-card__sign-label {
          margin-top: 0.7mm;
          border-top: 0.25mm solid #8f7d70;
          padding-top: 0.6mm;
          color: #6f6258;
          font-size: 1.85mm;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06mm;
        }
        .id-card-signature-text {
          overflow: hidden;
          color: #d9471f;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 4mm;
          font-style: italic;
          line-height: 1;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .id-card-signature-image {
          display: block;
          height: 6mm;
          max-width: 22mm;
          margin: 0 auto;
          object-fit: contain;
        }
        .official-id-card--back {
          background: linear-gradient(180deg, #ffffff 0%, #fffaf6 100%);
        }
        .official-id-card__watermark {
          position: absolute;
          inset: 15mm auto auto 30mm;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 31mm;
          height: 31mm;
          border: 0.35mm solid #f6ded1;
          border-radius: 50%;
          color: #f6ded1;
          opacity: 0.28;
          pointer-events: none;
        }
        .official-id-card__back-header {
          position: relative;
          display: grid;
          grid-template-columns: 9mm 1fr;
          gap: 2.2mm;
          min-height: 12.2mm;
          padding: 2.3mm 3.2mm 1.7mm;
          border-bottom: 0.25mm solid #eadfd6;
          background: #fff8ef;
        }
        .official-id-card__back-org {
          margin: 0;
          max-height: 4.8mm;
          overflow: hidden;
          font-size: 2.75mm;
          font-weight: 800;
          line-height: 1.15;
        }
        .official-id-card__back-address {
          margin: 0.5mm 0 0;
          max-height: 4.6mm;
          overflow: hidden;
          color: #6f6258;
          font-size: 2mm;
          font-weight: 600;
          line-height: 1.15;
          word-break: break-word;
        }
        .official-id-card__back-body {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 17mm;
          gap: 3mm;
          padding: 2.8mm 3.2mm 0;
        }
        .official-id-card__back-title {
          margin: 0;
          color: #d9471f;
          font-size: 3mm;
          font-weight: 800;
          line-height: 1.1;
        }
        .official-id-card__notice {
          margin: 1.7mm 0 0;
          color: #3a332e;
          font-size: 2.25mm;
          font-weight: 600;
          line-height: 1.35;
        }
        .official-id-card__contact {
          margin-top: 2mm;
          color: #6f6258;
          font-size: 2mm;
          font-weight: 700;
          line-height: 1.25;
          word-break: break-word;
        }
        .official-id-card__back-qr {
          display: grid;
          gap: 0.8mm;
          justify-items: center;
          align-content: start;
          color: #6f6258;
          font-size: 1.8mm;
          font-weight: 800;
          text-align: center;
          text-transform: uppercase;
        }
        .official-id-card__back-footer {
          position: absolute;
          left: 3.2mm;
          right: 3.2mm;
          bottom: 2.2mm;
        }
        .official-id-card__signatures {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8mm;
          align-items: end;
          margin-bottom: 1.5mm;
          text-align: center;
        }
        .official-id-card__disclaimer {
          border-top: 0.25mm solid #eadfd6;
          padding-top: 1mm;
          color: #8c7d72;
          font-size: 1.75mm;
          font-weight: 600;
          line-height: 1.2;
          text-align: center;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #id-card-print-area,
          #id-card-print-area * {
            visibility: visible;
          }
          #id-card-print-area {
            position: absolute;
            inset: 0;
            display: block;
            width: 85.6mm;
            padding: 0;
          }
          .id-card-panel {
            overflow: visible;
            break-after: page;
            page-break-after: always;
          }
          .id-card-panel:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .official-id-card {
            border-radius: 0;
          }
          .id-card-side-label,
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Identity</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">ID Card</h1>
          <p className="mt-2 text-sm text-muted-foreground">Auto-generated from your approved member profile and registration information.</p>
        </div>
        <Button type="button" onClick={handleDownload} disabled={downloading} className="no-print w-fit">
          <Download className="h-4 w-4" aria-hidden="true" />
          {downloading ? "Preparing PDF..." : "Download PDF"}
        </Button>
      </div>

      {missing.length ? (
        <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold">Some ID card information is missing</div>
            <p className="mt-1">Missing: {missing.join(", ")}. Please contact the association office to update your record.</p>
          </div>
        </div>
      ) : null}

      <div id="id-card-print-area" className="id-card-preview-grid">
        <div className="id-card-panel">
          <div className="id-card-side-label">Front side</div>
          <div className="official-id-card official-id-card--front">
            <div className="official-id-card__header">
              <div className="official-id-card__logo">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" />
                ) : (
                  <IdCard className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="official-id-card__kicker">Member ID Card</p>
                <h2 className="official-id-card__org">{organizationName}</h2>
              </div>
            </div>
            <div className={`official-id-card__front-body${fields.photo ? "" : " official-id-card__front-body--no-photo"}`}>
              {fields.photo ? (
                <div className="official-id-card__photo-wrap">
                  <div className="official-id-card__photo">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" />
                    ) : (
                      <UserRound className="h-10 w-10" aria-hidden="true" />
                    )}
                  </div>
                  {member.status === "approved" && fields.approvedSeal ? <div className="official-id-card__verified">V</div> : null}
                </div>
              ) : null}
              <div className="official-id-card__details">
                {fields.memberName ? <h3 className="official-id-card__name">{profile.data.fullName}</h3> : null}
                {fields.memberId || fields.bloodGroup ? (
                  <div className="official-id-card__badges">
                    {fields.memberId ? <span className="official-id-card__badge">ID {profile.data.memberId ?? "Pending"}</span> : null}
                    {fields.bloodGroup && bloodGroup ? <span className="official-id-card__badge official-id-card__badge--blood">{bloodGroup}</span> : null}
                  </div>
                ) : null}
                <div className="official-id-card__info">
                  {fields.phone && profile.data.phone ? (
                    <div className="official-id-card__row">
                      <span>Phone</span>
                      <span>{profile.data.phone}</span>
                    </div>
                  ) : null}
                  {fields.address && address ? (
                    <div className="official-id-card__row">
                      <span>Address</span>
                      <span className="official-id-card__address">{address}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className={`official-id-card__footer${fields.qrCode && fields.approvedSeal && fields.signatures ? "" : " official-id-card__footer--compact"}`}>
              {fields.qrCode ? (
                <div className="official-id-card__qr">
                  <div className="official-id-card__qr-box">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="" />
                    ) : (
                      <IdCard className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <span>Scan to verify</span>
                </div>
              ) : <span />}
              {fields.approvedSeal ? <div className="official-id-card__seal">Approved<br />Member</div> : <span />}
              {fields.signatures && signatures.filter((signature) => signature.showOnCard)[0] ? (
                <div className="official-id-card__sign-mini">
                  <SignaturePreview signature={signatures.filter((signature) => signature.showOnCard)[0]} />
                  <div className="official-id-card__sign-label">Authorised</div>
                </div>
              ) : <span />}
            </div>
          </div>
        </div>

        <div className="id-card-panel">
          <div className="id-card-side-label">Back side</div>
          <div className="official-id-card official-id-card--back">
            <div className="official-id-card__watermark">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" />
              ) : (
                <IdCard className="h-14 w-14" aria-hidden="true" />
              )}
            </div>
            <div className="official-id-card__back-header">
              <div className="official-id-card__logo">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" />
                ) : (
                  <IdCard className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div>
                <h2 className="official-id-card__back-org">{organizationName}</h2>
                {fields.organizationAddress ? <p className="official-id-card__back-address">{organizationAddress}</p> : null}
              </div>
            </div>
            <div className="official-id-card__back-body">
              <div>
                <h3 className="official-id-card__back-title">Verification & Return Information</h3>
                {fields.returnNotice ? (
                  <p className="official-id-card__notice">
                    This card is issued to an approved member of the association. If found, please return it to the association office.
                  </p>
                ) : null}
                {fields.organizationAddress ? <p className="official-id-card__contact">{organizationAddress}</p> : null}
              </div>
              {fields.qrCode ? (
                <div className="official-id-card__back-qr">
                  <div className="official-id-card__qr-box">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="" />
                    ) : (
                      <IdCard className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <span>Verify</span>
                </div>
              ) : null}
            </div>
            <div className="official-id-card__back-footer">
              {fields.signatures ? (
                <div className="official-id-card__signatures">
                  {signatures.filter((signature) => signature.showOnCard).slice(0, 2).map((signature) => (
                    <div key={signature.key}>
                      <SignaturePreview signature={signature} />
                      <div className="official-id-card__sign-label">{signature.label}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {fields.returnNotice ? (
                <div className="official-id-card__disclaimer">
                  This ID card remains the property of the association and must be presented for verification when requested.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
