import UploadImage from "@/components/UploadImage";

export default function Home() {
    return (
        <div className="font-sans min-h-screen p-8 sm:p-20 flex items-center justify-center">
            <main className="w-full max-w-3xl">
                <h1 className="text-2xl font-semibold mb-4">Upload an image</h1>
                <UploadImage />
            </main>
        </div>
    );
}
