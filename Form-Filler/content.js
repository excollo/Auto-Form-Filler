chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request.action);

  if (request.action === "ping") {
    sendResponse({ status: "ok" });
    return true;
  }

  if (request.action === "fillForm") {
    try {
      const formData = request.data;
      console.log("Received form data:", formData);
      clearForm();

      const filledFields = new Map();
      const inputMappings = {
        "Full Name": 'input[placeholder="Enter Full name"]',
        "Mobile No": 'input[placeholder="Enter Mobile No."]',
        "Identity No": 'input[placeholder="Enter Identity No."]',
      };

      Object.entries(inputMappings).forEach(([fieldName, selector]) => {
        const field = document.querySelector(selector);
        if (field && formData[fieldName]) {
          field.value = formData[fieldName];
          triggerEvents(field);
          filledFields.set(fieldName, true);
          console.log(`Filled field: ${fieldName}`);
        } else {
          console.warn(`Field "${fieldName}" not found or no data provided.`);
        }
      });

      const debugDropdowns = () => {
        console.log("DEBUG: Dropdown Elements");
        const dropdowns = document.querySelectorAll('[role="combobox"]');
      
        console.log(`Total dropdowns found: ${dropdowns.length}`);
        
        dropdowns.forEach((dropdown, index) => {
          console.log(`Dropdown ${index}:`, {
            textContent: dropdown.textContent,
            innerHTML: dropdown.innerHTML,
            outerHTML: dropdown.outerHTML,
            attributes: Array.from(dropdown.attributes).map(
              (attr) => `${attr.name}="${attr.value}`
            ),
          });
        });
      };

      if (formData["Tourist Type"]) {
        fillTouristTypeDropdown(formData["Tourist Type"])
          .then((result) => {
            console.log(result);
            filledFields.set("Tourist Type", true);

            debugDropdowns();

            return new Promise((resolve) => {
              setTimeout(() => {
                console.log("Attempting to fill Identity Proof dropdown");
                resolve();
              }, 0);
            });
          })
          .then(() => {
            if (formData["Select Identity Proof"]) {
              return fillIdentityProofDropdown(
                formData["Select Identity Proof"]
              );
            }
          })
          .then((result) => {
            if (result) {
              console.log(result);

              filledFields.set("Select Identity Proof", true);
              debugDropdowns();

              return new Promise((resolve) => {
                setTimeout(() => {
                  console.log("Attempting to fill Gender dropdown");
                  resolve();
                }, 0);
              });
            }
          })
          .then(() => {
            if (formData["Select Gender"]) {
              return fillGenderDropdown(formData["Select Gender"]);
            }
          })
          .then((result) => {
            if (result) {
              console.log(result);
              filledFields.set("Select Gender", true);
              sendResponse({
                success: true,
                message: `Fields filled: ${filledFields.size}`,
                filledFields: Array.from(filledFields.keys()),
              });
            }
          })
          .catch((error) => {
            console.error("Dropdown filling error:", error);
            sendResponse({
              success: false,
              error: error.message,
            });
          });
      } else {
        console.warn("Tourist Type data not provided.");
      }
      return true;
    } catch (error) {
      console.error("Error filling form:", error);
      sendResponse({
        success: false,
        error: error.message,
      });
      return true;
    }
  }
});

async function fillTouristTypeDropdown(touristTypeValue) {
  return new Promise((resolve, reject) => {
    try {
      const dropdownTriggers = [
        () => document.querySelector('div[role="combobox"][tabindex="0"]'),
        () => document.querySelector(".MuiSelect-select"),
        () => document.querySelector('[aria-haspopup="listbox"]'),
      ];

      let dropdownTrigger;
      for (let findTrigger of dropdownTriggers) {
        dropdownTrigger = findTrigger();
        if (dropdownTrigger) break;
      }

      if (!dropdownTrigger) {
        console.error("NO DROPDOWN TRIGGER FOUND. Detailed DOM Analysis:");
        console.log(
          "All combobox elements:",
          Array.from(document.querySelectorAll('[role="combobox"]')).map(
            (el) => ({
              textContent: el.textContent,
              classes: el.className,
              attributes: Array.from(el.attributes).map(
                (a) => `${a.name}="${a.value}`
              ),
            })
          )
        );
        return reject("No dropdown trigger found");
      }

      dropdownTrigger.click();
      dropdownTrigger.dispatchEvent(
        new MouseEvent("mousedown", {
          view: window,
          bubbles: true,
          cancelable: true,
        })
      );

      const optionSelectors = [
        '[role="option"]',
        ".MuiMenuItem-root",
        'li[role="option"]',
        'ul[role="listbox"] > li',
        ".MuiList-root > li",
      ];

      const findOptions = () => {
        let foundOptions = [];
        for (let selector of optionSelectors) {
          foundOptions = Array.from(document.querySelectorAll(selector));
          if (foundOptions.length > 0) break;
        }
        return foundOptions;
      };

      const attemptFindOptions = (attempt = 0) => {
        const options = findOptions();

        console.log(`Attempt ${attempt + 1}: Found ${options.length} options`);

        if (options.length > 0) {
          console.log(
            "Option Details:",
            options.map((opt) => ({
              text: opt.textContent.trim(),
              classes: opt.className,
            }))
          );

          const matchingOption = options.find(
            (option) => option.textContent.trim() === touristTypeValue
          );

          if (matchingOption) {
            matchingOption.click();
            setTimeout(() => {
              const currentSelection = document.querySelector(
                'div[role="combobox"]'
              );
              console.log("Current Selection:", currentSelection.textContent);
              resolve("Tourist Type selected successfully");
            }, 300);
            return;
          } else {
            console.warn(`No exact match for "${touristTypeValue}"`);
            console.warn(
              "Available options:",
              options.map((opt) => opt.textContent.trim())
            );
          }
        }
        if (attempt < 3) {
          setTimeout(() => attemptFindOptions(attempt + 1), 500);
        } else {
          reject(`Could not find option: ${touristTypeValue}`);
        }
      };
      attemptFindOptions();
    } catch (error) {
      console.error("Dropdown Error:", error);
      reject(error.message);
    }
  });
}

async function fillIdentityProofDropdown(selectedValue) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Attempting to select Identity Proof: ${selectedValue}`);
      const dropdownTriggers = [
        () => {
          const dropdowns = document.querySelectorAll('[role="combobox"]');
          return dropdowns.length > 1 ? dropdowns[1] : null;
        },
        () => document.querySelector('div[role="combobox"]:nth-child(2)'),
        () => document.querySelectorAll(".MuiSelect-select")[1],
      ];

      let dropdownTrigger;
      for (let findTrigger of dropdownTriggers) {
        dropdownTrigger = findTrigger();
        if (dropdownTrigger) break;
      }

      if (!dropdownTrigger) {
        console.error(
          "NO DROPDOWN TRIGGER FOUND FOR IDENTITY PROOF. Detailed Analysis:"
        );
        const allDropdowns = document.querySelectorAll('[role="combobox"]');
        console.log(`Total dropdowns: ${allDropdowns.length}`);
        allDropdowns.forEach((dd, index) => {
          console.log(`Dropdown ${index}:`, dd.outerHTML);
        });
        return reject("No dropdown trigger found for Identity Proof");
      }

      console.log("Identity Proof Dropdown Trigger:", {
        textContent: dropdownTrigger.textContent,
        outerHTML: dropdownTrigger.outerHTML,
      });

      dropdownTrigger.click();
      dropdownTrigger.dispatchEvent(
        new MouseEvent("mousedown", {
          view: window,
          bubbles: true,
          cancelable: true,
        })
      );

      setTimeout(() => {
        const optionSelectors = [
          '[role="option"]',
          ".MuiMenuItem-root",
          'li[role="option"]',
        ];

        let allOptions = [];
        optionSelectors.forEach((selector) => {
          const options = Array.from(document.querySelectorAll(selector));
          allOptions = allOptions.concat(options);
        });

        console.log(
          "All Available Options:",
          allOptions.map((opt) => opt.textContent.trim())
        );

        let matchingOption;
        for (let selector of optionSelectors) {
          const options = Array.from(document.querySelectorAll(selector));
          matchingOption = options.find(
            (el) =>
              el.textContent.trim().toLowerCase() ===
              selectedValue.toLowerCase()
          );
          if (matchingOption) break;
        }

        if (matchingOption) {
          matchingOption.click();
          resolve("Identity Proof selected successfully");
        } else {
          console.warn(`No matching option for "${selectedValue}"`);
          console.warn(
            "Available options:",
            allOptions.map((opt) => opt.textContent.trim())
          );
          reject(`Option for "${selectedValue}" not found`);
        }
      }, 1000);
    } catch (error) {
      console.error("Identity Proof Dropdown Error:", error);
      reject(error.message);
    }
  });
}

async function fillGenderDropdown(genderValue) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Attempting to select Gender: ${genderValue}`);

      const dropdownTriggers = [
        () => {
          const dropdowns = document.querySelectorAll('[role="combobox"]');
          return dropdowns.length > 2 ? dropdowns[2] : null;
        },
        () => document.querySelector('div[role="combobox"]:nth-child(3)'),
        () => document.querySelectorAll(".MuiSelect-select")[2],
      ];

      let dropdownTrigger;
      for (let findTrigger of dropdownTriggers) {
        dropdownTrigger = findTrigger();
        if (dropdownTrigger) break;
      }

      if (!dropdownTrigger) {
        console.error(
          "NO DROPDOWN TRIGGER FOUND FOR GENDER. Detailed Analysis:"
        );
        const allDropdowns = document.querySelectorAll('[role="combobox"]');
        console.log(`Total dropdowns: ${allDropdowns.length}`);
        allDropdowns.forEach((dd, index) => {
          console.log(`Dropdown ${index}:`, dd.outerHTML);
        });
        return reject("No dropdown trigger found for Gender");
      }

      console.log("Gender Dropdown Trigger:", {
        textContent: dropdownTrigger.textContent,
        outerHTML: dropdownTrigger.outerHTML,
      });

      dropdownTrigger.click();
      dropdownTrigger.dispatchEvent(
        new MouseEvent("mousedown", {
          view: window,
          bubbles: true,
          cancelable: true,
        })
      );

      setTimeout(() => {
        const optionSelectors = [
          '[role="option"]',
          ".MuiMenuItem-root",
          'li[role="option"]',
        ];

        let allOptions = [];
        optionSelectors.forEach((selector) => {
          const options = Array.from(document.querySelectorAll(selector));
          allOptions = allOptions.concat(options);
        });

        console.log(
          "All Available Gender Options:",
          allOptions.map((opt) => opt.textContent.trim())
        );

        let matchingOption;
        for (let selector of optionSelectors) {
          const options = Array.from(document.querySelectorAll(selector));
          matchingOption = options.find(
            (el) =>
              el.textContent.trim().toLowerCase() === genderValue.toLowerCase()
          );
          if (matchingOption) break;
        }

        if (matchingOption) {
          matchingOption.click();
          resolve("Gender selected successfully");
        } else {
          console.warn(`No matching option for "${genderValue}"`);
          console.warn(
            "Available Gender options:",
            allOptions.map((opt) => opt.textContent.trim())
          );
          reject(`Option for "${genderValue}" not found`);
        }
      }, 1000);
    } catch (error) {
      console.error("Gender Dropdown Error:", error);
      reject(error.message);
    }
  });
}

function triggerEvents(element) {
  const event = new Event("input", { bubbles: true });
  element.dispatchEvent(event);
}

function clearForm() {
  const fields = document.querySelectorAll("input, textarea, select");
  fields.forEach((field) => {
    if (field.type !== "submit" && field.type !== "button") {
      field.value = "";
      triggerEvents(field);
    }
  });
}