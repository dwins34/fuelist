import Image from "next/image"

export default function Logo({
  size = 24,
}: {
  size?: number
}) {
  return (
    <Image
      src="/logo.png"
      alt="Fuelist"
      width={size}
      height={size}
      className="inline-block"
    />
  )
}