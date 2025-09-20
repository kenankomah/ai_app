import UploadImage from "@/components/UploadImage";

export default function Home() {
    return (
        <div className="font-sans min-h-screen bg-[radial-gradient(1000px_500px_at_10%_-10%,#111_20%,transparent),radial-gradient(800px_400px_at_90%_110%,#222_20%,transparent)] text-foreground">
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.4))]" />
            <main className="w-full max-w-4xl mx-auto px-6 py-16">
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                        Image Editor
                    </h1>
                    <p className="text-sm text-foreground/70 mt-2">
                        Upload an image and describe the edit you want.
                    </p>
                </div>
                <UploadImage />
            </main>
        </div>
    );
}
