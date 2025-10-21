import { SignIn } from "@clerk/nextjs";
import { Box } from "@mui/material";

const SignInPage = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#121212", // Dark background for the page
      }}
    >
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#0b93f6", // Your app's primary blue color
            colorText: "#ffffff",
            colorBackground: "#1e1e1e",
            colorInputBackground: "#333",
            colorInputText: "#ffffff",
          },
          elements: {
            card: {
              backgroundColor: "#1e1e1e",
              boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.5)",
              border: "1px solid #333",
            },
            headerTitle: {
              color: "#ffffff",
            },
            headerSubtitle: {
              color: "#aaaaaa",
            },
            formButtonPrimary: {
              "&:hover": {
                backgroundColor: "#0a84e0",
              },
            },
            socialButtonsBlockButton: {
                borderColor: "#555",
                "&:hover": {
                    backgroundColor: "#2a2a2a",
                }
            },
            footerActionLink: {
                color: "#0b93f6",
                "&:hover": {
                    color: "#0a84e0"
                }
            }
          },
        }}
      />
    </Box>
  );
};

export default SignInPage;