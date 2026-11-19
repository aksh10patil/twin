import os
import shutil
import zipfile
import subprocess
import sys


def build_package():
    print("Creating Lambda deployment package...")

    # Clean up
    if os.path.exists("lambda-package"):
        shutil.rmtree("lambda-package")
    if os.path.exists("lambda-deployment.zip"):
        os.remove("lambda-deployment.zip")

    os.makedirs("lambda-package")

    # Install dependencies
    print("Installing dependencies for Lambda runtime (Python 3.12, x86_64)...")

    # Try uv first (fastest, no Docker required)
    uv_available = shutil.which("uv") is not None
    if uv_available:
        print("Using uv to install cross-platform dependencies...")
        subprocess.run(
            [
                "uv",
                "pip",
                "install",
                "--target",
                "lambda-package",
                "--python-platform",
                "x86_64-unknown-linux-gnu",
                "--python-version",
                "3.12",
                "-r",
                "requirements.txt",
            ],
            check=True,
        )
    else:
        print("uv not found, using Docker...")
        subprocess.run(
            [
                "docker",
                "run",
                "--rm",
                "-v",
                f"{os.getcwd()}:/var/task",
                "--platform",
                "linux/amd64",
                "--entrypoint",
                "",
                "public.ecr.aws/lambda/python:3.12",
                "/bin/sh",
                "-c",
                "pip install --target /var/task/lambda-package -r /var/task/requirements.txt --platform manylinux2014_x86_64 --only-binary=:all: --upgrade",
            ],
            check=True,
        )

    # Copy application files
    print("Copying application files...")
    for file in ["server.py", "lambda_handler.py", "context.py", "resources.py"]:
        if os.path.exists(file):
            shutil.copy2(file, "lambda-package/")

    # Copy data directory
    if os.path.exists("data"):
        shutil.copytree("data", "lambda-package/data")

    # Create zip
    print("Creating zip file...")
    with zipfile.ZipFile("lambda-deployment.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-package"):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, "lambda-package")
                zipf.write(file_path, arcname)

    size_mb = os.path.getsize("lambda-deployment.zip") / (1024 * 1024)
    print(f"✓ Created lambda-deployment.zip ({size_mb:.2f} MB)")
    return "lambda-deployment.zip"


def deploy_to_lambda(function_name="twin-backend"):
    print(f"Updating AWS Lambda function '{function_name}'...")
    cmd = [
        "aws",
        "lambda",
        "update-function-code",
        "--function-name",
        function_name,
        "--zip-file",
        "fileb://lambda-deployment.zip",
    ]
    subprocess.run(cmd, check=True)
    print(f"✓ Successfully deployed code to AWS Lambda '{function_name}'!")


def main():
    build_package()
    if "--deploy" in sys.argv:
        deploy_to_lambda()


if __name__ == "__main__":
    main()
