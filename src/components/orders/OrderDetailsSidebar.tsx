import StatusBadge from "../shared/StatusBadge"
import SectionTitle from "../shared/SectionTitle"
import CompactDetailCard from "../shared/CompactDetailCard"
import DetailRow from "../shared/DetailRow"
import { HardDrive, Triangle } from "lucide-react"
import { LANGUAGES } from "../../constants/languages"

type Props = {
  selectedOrder: any

  editedOrder: any

  setSelectedOrder: (
    order: any
  ) => void

  setIsEditingOrder: (
    value: boolean
  ) => void

  setIsEditing: (
    value: boolean
  ) => void

  setEditingOrderId: (
    id: string
  ) => void

  setNewOrder: (
    value: any
  ) => void

  setShowModal: (
    value: boolean
  ) => void

  showDeleteModal: boolean
  
  setShowDeleteModal: (
    value: boolean
  ) => void

  setDeletingOrderId: (
    id: string
  ) => void
  
  deleteOrder: () => void
  canManageOrders: boolean
  getDeadlineInfo: (
  deadlineDate: string
) => {
  text: string
  color: string
}
}

export default function OrderDetailsSidebar({
  selectedOrder,
  editedOrder,
  setSelectedOrder,
  setIsEditingOrder,
  setIsEditing,
  setEditingOrderId,
  setNewOrder,
  setShowModal,
  showDeleteModal,
  setShowDeleteModal,
  setDeletingOrderId,
  deleteOrder,
  canManageOrders,
  getDeadlineInfo
}: Props) {

    function getLanguageCode(
    languageName: string
  ) {
    return (
      LANGUAGES.find(
        (l) =>
          l.name === languageName
      )?.code.toUpperCase() ||
      languageName.slice(0, 2).toUpperCase()
    )
  }
  return (
   <div className="w-[430px] border-l border-[#2A2A2A] bg-[#090909] overflow-auto flex-shrink-0">

      <div className="p-8">

{/* HEADER */}
<div className="mb-8 relative border-b border-[#242424] pb-6">

  {/* CLOSE */}
  <button
    onClick={() => {
      setSelectedOrder(null)
      setIsEditingOrder(false)
    }}
    className="absolute top-0 right-0 text-zinc-400 hover:text-white transition text-xl"
  >
    ✕
  </button>

  {/* TITLE */}
  <h1 className="text-[34px] font-bold tracking-tight text-[#F5F1E8] leading-tight max-w-[280px]">
    {selectedOrder.title}
  </h1>

  {/* STATUS */}
  <div className="mt-5 flex items-center gap-3">

    <StatusBadge
      status={selectedOrder.status}
    />

    {selectedOrder.priority && (
      <div
        className={`px-3 py-1 rounded-lg text-[11px] font-semibold border ${
          selectedOrder.priority ===
          "HIGH"
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : selectedOrder.priority ===
              "MEDIUM"
            ? "bg-yellow-500/10 border-yellow-500/20 text-[#D6B36A]"
            : "bg-green-500/10 border-green-500/20 text-green-400"
        }`}
      >
        {selectedOrder.priority}
      </div>
    )}

  </div>

</div>
        {/* GENERAL */}
        <div className="mb-10">

          <SectionTitle title="General" />

          <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

  <div className="flex justify-between items-center">

    <p className="text-zinc-500 text-sm">
      Created By
    </p>

    <p className="text-[#F5F1E8] font-medium">
      {
        selectedOrder.createdBy
          ?.name || "-"
      }
    </p>

  </div>

  <div className="flex justify-between items-center">

    <p className="text-zinc-500 text-sm">
      Type
    </p>

    <p className="text-[#F5F1E8] font-medium">
      {selectedOrder.type}
    </p>

  </div>

  <div className="flex justify-between items-center">

    <p className="text-zinc-500 text-sm">
      Date Added
    </p>

    <p className="text-[#F5F1E8] font-medium">
      {new Date(
        selectedOrder.dateAdded
      ).toLocaleDateString()}
    </p>

  </div>

</div>

        </div>

{/* BROADCAST */}
{editedOrder?.broadcast && (
  <>
    {/* BASIC INFO */}
    <div className="mt-10">

      <SectionTitle title="Basic Information" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

  <div className="flex justify-between items-center">

    <p className="text-zinc-500 text-sm">
      Game
    </p>

    <p className="text-[#F5F1E8] font-medium">
      {
        editedOrder.broadcast?.game
          ?.name || "-"
      }
    </p>

  </div>

  <div className="flex justify-between items-center">

    <p className="text-zinc-500 text-sm">
      Estimated Length
    </p>

    <p className="text-[#F5F1E8] font-medium">
      {
        editedOrder.broadcast
          ?.estimatedMinutes
      }{" "}
      minutes
    </p>

  </div>

</div>

    </div>

{/* TRANSLATION DETAILS */}
<div className="mt-10">

  <SectionTitle title="Translation Details" />

  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-6">

{/* TRANSLATED FROM */}
<div className="flex flex-col gap-3">

  <p className="text-zinc-500 text-sm">
    Translated From
  </p>

  <div className="flex flex-wrap gap-2">

    {editedOrder.broadcast.sourceLanguage?.map(
      (lang: string) => (
        <div
          key={lang}
          className="group relative"
        >

          {/* LANGUAGE PILL */}
          <div
            className="
              min-w-[46px]
              h-[34px]
              inline-flex
              items-center
              justify-center
              rounded-full
              border
              border-[#2D2D2D]
              bg-[#1B1B1B]
              px-3
              text-xs
              font-semibold
              tracking-wide
              text-white
              transition
              hover:border-[#D6B36A]
              hover:text-[#D6B36A]
            "
          >
            {getLanguageCode(lang)}
          </div>

          {/* TOOLTIP */}
          <div
            className="
              pointer-events-none
              absolute
              left-1/2
              top-0
              z-50
              -translate-x-1/2
              -translate-y-[115%]
              opacity-0
              transition-all
              duration-200
              group-hover:opacity-100
            "
          >

            <div
              className="
                whitespace-nowrap
                rounded-xl
                border
                border-[#2D2D2D]
                bg-[#121212]
                px-3
                py-1.5
                text-xs
                font-medium
                text-[#F5F1E8]
                shadow-[0_0_20px_rgba(0,0,0,0.45)]
              "
            >
              {lang}
            </div>

          </div>

        </div>
      )
    )}

  </div>

</div>

{/* TRANSLATED TO */}
<div className="flex flex-col gap-3">

 <p className="text-zinc-500 text-sm">
    To Be Translated To
  </p>

  <div className="flex flex-wrap gap-2">

    {editedOrder.broadcast.targetLanguages.map(
      (lang: string) => (
        <div
          key={lang}
          className="group relative"
        >

          {/* LANGUAGE PILL */}
          <div
            className="
              min-w-[46px]
              h-[34px]
              inline-flex
              items-center
              justify-center
              rounded-full
              border
              border-[#F5F1E8]
              bg-[#F5F1E8]
              px-3
              text-xs
              font-bold
              tracking-wide
              text-black
              transition
              hover:bg-[#D6B36A]
              hover:border-[#D6B36A]
            "
          >
            {getLanguageCode(lang)}
          </div>

          {/* TOOLTIP */}
          <div
            className="
              pointer-events-none
              absolute
              left-1/2
              top-0
              z-50
              -translate-x-1/2
              -translate-y-[115%]
              opacity-0
              transition-all
              duration-200
              group-hover:opacity-100
            "
          >

            <div
              className="
                whitespace-nowrap
                rounded-xl
                border
                border-[#2D2D2D]
                bg-[#121212]
                px-3
                py-1.5
                text-xs
                font-medium
                text-[#F5F1E8]
                shadow-[0_0_20px_rgba(0,0,0,0.45)]
              "
            >
              {lang}
            </div>

          </div>

        </div>
      )
    )}

  </div>

</div>

    {/* FORMAT */}
    <div className="flex justify-between items-center">

      <p className="text-zinc-500 text-sm">
        Format
      </p>

      <p className="text-[#F5F1E8] font-medium">
        {
          editedOrder.broadcast
            ?.deliveryFormat
        }
      </p>

    </div>

  </div>

</div>
{/* DATES */}
<div className="mt-10">

  <SectionTitle title="Dates" />

  <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-6">

    {/* DELIVERY DATE */}
    <div className="flex justify-between items-start">

      <div className="flex items-start gap-3">

        {/* GOLD CALENDAR ICON */}
<div className="mt-[2px] text-[#D6B36A]">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
</div>

        <div>

          <p className="text-zinc-500 text-sm">
            Source Will Be Added On
          </p>

        </div>

      </div>

      <p className="text-[#F5F1E8] font-medium">
        {new Date(
          editedOrder.broadcast?.deliveryDate
        ).toLocaleDateString()}
      </p>

    </div>

    {/* DEADLINE */}
<div className="flex justify-between items-start">

  <div className="flex items-start gap-3">

    {/* GOLD CALENDAR ICON */}
    <div className="mt-[2px] text-[#D6B36A]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>

    <div>
      <p className="text-zinc-500 text-sm">
        Deadline
      </p>
    </div>

  </div>

  <div className="text-right">

    <p className="text-[#F5F1E8] font-medium">
      {new Date(
        editedOrder.broadcast?.deadlineDate
      ).toLocaleDateString()}
    </p>

    <p className="text-[#D6B36A] text-sm font-semibold mt-1">
      {
        getDeadlineInfo(
          editedOrder.broadcast
            ?.deadlineDate
        ).text
      }
    </p>

  </div>

</div>

  </div>

</div>

    {/* LINKS */}
    <div className="mt-10">

      <SectionTitle title="Links" />

      <div className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.08),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[28px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)] space-y-5">

  {/* SOURCE FILE */}
  <div className="flex items-start justify-between gap-4">

    <div className="flex items-start gap-3">

      {/* DRIVE LOGO */}
     <img
  src="/google-drive.png"
  alt="Drive"
  className="w-5 h-5 mt-[2px]"
/>

      <div>

        <p className="text-zinc-500 text-sm">
          Source File
        </p>

        <a
          href={
            editedOrder.broadcast
              ?.sourceFileLink
          }
          target="_blank"
          rel="noreferrer"
          className="text-[#D6B36A] underline text-sm break-all mt-1 block"
        >
          {
            editedOrder.broadcast
              ?.sourceFileLink
          }
        </a>

      </div>

    </div>

  </div>

</div>

    </div>

    {/* DELIVERIES */}
    <div className="mt-10">

      <SectionTitle title="Delivery Assets" />

      <div className="space-y-4">

        {editedOrder.broadcast?.deliveries?.map(
          (delivery: any) => (
           <div
  key={delivery.id}
  className="bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)] bg-[#111111] border border-[#242424] rounded-[24px] p-5 shadow-[0_0_30px_rgba(0,0,0,0.35)]"
>

  <div className="flex items-start justify-between gap-4">

    <div className="flex items-start gap-3">

     <img
  src="/google-drive.png"
  alt="Drive"
  className="w-5 h-5 mt-[2px]"
/>

      <div>

        <p className="text-[#F5F1E8] font-semibold">
          {delivery.language}
        </p>

        {delivery.deliveryLink ? (
          <a
            href={delivery.deliveryLink}
            target="_blank"
            rel="noreferrer"
            className="text-[#D6B36A] underline text-sm break-all mt-1 block"
          >
            {delivery.deliveryLink}
          </a>
        ) : (
          <p className="text-sm text-zinc-600 mt-1">
            No delivery link added yet
          </p>
        )}

      </div>

    </div>

  </div>

</div>
          )
        )}

      </div>

    </div>

  </>
)}

        {/* MARKETING */}
{/* MARKETING */}
{editedOrder?.marketing && (
  <div className="mt-10">

    <SectionTitle title="Marketing Details" />

    <div className="space-y-5">

      {/* FORMAT */}
      <div
        className="
          bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)]
          bg-[#111111]
          border
          border-[#242424]
          rounded-[28px]
          p-6
          shadow-[0_0_40px_rgba(0,0,0,0.35)]
        "
      >

        <div className="flex items-center justify-between">

          <div>

            <p className="text-zinc-500 text-sm">
              Delivery Format
            </p>

            <p className="mt-2 text-[#F5F1E8] font-semibold">
              {
                editedOrder
                  .marketing
                  ?.deliveryFormat
              }
            </p>

          </div>

          <div
            className="
              px-3
              py-1.5
              rounded-xl
              border
              border-[#2B2B2B]
              bg-[#171717]
              text-xs
              font-semibold
              tracking-wide
              text-[#F5F1E8]
            "
          >
            FORMAT
          </div>

        </div>

      </div>

      {/* SOURCE FILE */}
      <div
        className="
          bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)]
          bg-[#111111]
          border
          border-[#242424]
          rounded-[28px]
          p-6
          shadow-[0_0_40px_rgba(0,0,0,0.35)]
        "
      >

        <div className="flex items-start gap-4">

          <img
            src="/google-drive.png"
            alt="Drive"
            className="w-5 h-5 mt-[2px]"
          />

          <div className="flex-1 min-w-0">

            <p className="text-zinc-500 text-sm">
              Source File
            </p>

            <a
              href={
                editedOrder
                  .marketing
                  ?.sourceFileLink
              }
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-2
                block
                text-sm
                text-[#D6B36A]
                hover:text-[#E7C989]
                underline
                transition-colors
                break-all
              "
            >
              {
                editedOrder
                  .marketing
                  ?.sourceFileLink
              }
            </a>

          </div>

        </div>

      </div>

      {/* DELIVERED FILE */}
      <div
        className="
          bg-[radial-gradient(circle_at_top,rgba(214,179,106,0.06),transparent_60%)]
          bg-[#111111]
          border
          border-[#242424]
          rounded-[28px]
          p-6
          shadow-[0_0_40px_rgba(0,0,0,0.35)]
        "
      >

        <div className="flex items-start gap-4">

          <img
            src="/google-drive.png"
            alt="Drive"
            className="w-5 h-5 mt-[2px]"
          />

          <div className="flex-1 min-w-0">

            <p className="text-zinc-500 text-sm">
              Delivered Asset
            </p>

            {editedOrder
              .marketing
              ?.deliveredLink ? (

              <a
                href={
                  editedOrder
                    .marketing
                    ?.deliveredLink
                }
                target="_blank"
                rel="noopener noreferrer"
                className="
                  mt-2
                  block
                  text-sm
                  text-[#D6B36A]
                  hover:text-[#E7C989]
                  underline
                  transition-colors
                  break-all
                "
              >
                {
                  editedOrder
                    .marketing
                    ?.deliveredLink
                }
              </a>

            ) : (

              <p className="mt-2 text-sm text-zinc-600">
                No delivered asset added yet
              </p>

            )}

          </div>

        </div>

      </div>

    </div>

  </div>
)}

      </div>

      {/* BOTTOM ACTIONS */}
{/* BOTTOM ACTIONS */}
<div className="sticky bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-zinc-800 p-6 mt-10">
{canManageOrders && (
  <div className="grid grid-cols-2 gap-3">

    {/* EDIT */}
    
    <button
      onClick={() => {
        setIsEditing(true)

        setEditingOrderId(
          selectedOrder.id
        )

        setNewOrder({
          title:
            selectedOrder.title,

          game:
            selectedOrder
              .broadcast?.game
              ?.name || "",

          type:
            selectedOrder.type ===
            "MARKETING"
              ? "Marketing"
              : "Broadcast",

          status:
            selectedOrder.status,

          sourceLanguage:
            selectedOrder
              .broadcast
              ?.sourceLanguage ||
            [],

          targetLanguages:
            selectedOrder
              .broadcast
              ?.targetLanguages ||
            [],

          format:
            selectedOrder
              .broadcast
              ?.deliveryFormat ||
            selectedOrder
              .marketing
              ?.deliveryFormat,

          deadline:
            selectedOrder
              .broadcast
              ?.deadlineDate?.split(
                "T"
              )[0] || "",

          deliveryDate:
            selectedOrder
              .broadcast
              ?.deliveryDate?.split(
                "T"
              )[0] || "",

          sourceFileLink:
            selectedOrder
              .broadcast
              ?.sourceFileLink ||
            selectedOrder
              .marketing
              ?.sourceFileLink ||
            "",

          estimatedMinutes:
            String(
              selectedOrder
                .broadcast
                ?.estimatedMinutes ||
                ""
            ),

          deliveries:
  selectedOrder.broadcast?.deliveries?.map(
    (delivery: any) => ({
      id: delivery.id,
      language: delivery.language,
      deliveryLink:
        delivery.deliveryLink || "",
    })
  ) || [],
        })

        setShowModal(true)
      }}
     className="bg-[#D6B36A] text-black py-3 rounded-2xl font-semibold hover:bg-[#E4C27C] transition"
    >
      Edit Order
    </button>

    {/* DELETE */}
<button
  onClick={() => {
    setDeletingOrderId(
      selectedOrder.id
    )

    setShowDeleteModal(true)
  }}
  className="bg-[#1A1212] border border-red-500/20 text-red-400 py-3 rounded-2xl font-semibold hover:bg-red-500/10 transition"
>
  Delete Order
</button>

  </div>
)}
</div>

    </div>
  )
}