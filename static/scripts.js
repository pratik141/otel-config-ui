document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("save-button");

    const addDeleteButtonToTab = (tab) => {
        if (tab.querySelector(".delete-button")) return; // Skip if already exists

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "x";
        deleteButton.className = "delete-button";

        tab.appendChild(deleteButton);

        // Add delete event listener
        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent tab activation on delete button click

            const section = tab.dataset.section;
            const subsection = tab.dataset.subsection;

            // Confirm deletion
            if (confirm(`Are you sure you want to delete subsection "${subsection}"?`)) {
                const contents = document.querySelector(".tab-contents");
                const content = contents.querySelector(
                    `.config-content[data-section="${section}"][data-subsection="${subsection}"]`
                );
                if (content) {
                    content.remove(); // Remove associated textarea
                }
                tab.remove(); // Remove tab

                // Activate the first remaining tab, if any
                const firstTab = tab.parentNode.querySelector(".tab-button:not(.add-tab)");
                if (firstTab) {
                    const firstContent = contents.querySelector(
                        `.config-content[data-section="${firstTab.dataset.section}"][data-subsection="${firstTab.dataset.subsection}"]`
                    );
                    if (firstContent) {
                        activateTab(firstTab, firstContent);
                    }
                }
            }
        });
    };

    // Handle tab switching, adding, and deleting subsections
    document.querySelectorAll(".tabs-container").forEach((container) => {
        const tabs = container.querySelector(".tabs");
        const contents = container.querySelector(".tab-contents");

        const activateTab = (tab, content) => {
            // Deactivate all tabs and hide all textareas
            tabs.querySelectorAll(".tab-button").forEach((t) => t.classList.remove("active"));
            contents.querySelectorAll(".config-content").forEach((c) => (c.style.display = "none"));
            addDeleteButtonToTab(tab);

            // Activate the selected tab and show its textarea
            tab.classList.add("active");
            content.style.display = "block";
        };

        tabs.addEventListener("click", (event) => {
            const tab = event.target.closest(".tab-button");
            if (!tab) return;

            const section = tab.dataset.section;
            const subsection = tab.dataset.subsection;

            // Handle "Add New" logic
            if (tab.classList.contains("add-tab")) {
                const newSubsectionName = prompt("Enter the name of the new subsection:");
                if (newSubsectionName) {
                    // Create new tab
                    const newTab = document.createElement("button");
                    newTab.className = "tab-button";
                    newTab.dataset.section = section;
                    newTab.dataset.subsection = newSubsectionName;
                    newTab.textContent = `${newSubsectionName} (x)`;

                    // Create new content
                    const newTextarea = document.createElement("textarea");
                    newTextarea.className = "config-content";
                    newTextarea.dataset.section = section;
                    newTextarea.dataset.subsection = newSubsectionName;
                    newTextarea.style.display = "none";
                    newTextarea.value = "{}"; // Default JSON content

                    // Add the new tab and content
                    tabs.insertBefore(newTab, tab);
                    contents.appendChild(newTextarea);

                    // Activate the new tab
                    activateTab(newTab, newTextarea);
                }
            } else {
                // Handle regular tab activation
                const content = contents.querySelector(
                    `.config-content[data-section="${section}"][data-subsection="${subsection}"]`
                );
                if (content) {
                    activateTab(tab, content);
                }
            }
        });

        // Delete subsection logic
        tabs.addEventListener("dblclick", (event) => {
            const tab = event.target.closest(".tab-button");
            if (!tab || tab.classList.contains("add-tab")) return;

            const section = tab.dataset.section;
            const subsection = tab.dataset.subsection;

            // Confirm deletion
            if (confirm(`Are you sure you want to delete subsection "${subsection}"?`)) {
                const content = contents.querySelector(
                    `.config-content[data-section="${section}"][data-subsection="${subsection}"]`
                );
                if (content) {
                    content.remove(); // Remove textarea
                }
                tab.remove(); // Remove tab

                // Activate the first remaining tab, if any
                const firstTab = tabs.querySelector(".tab-button:not(.add-tab)");
                if (firstTab) {
                    const firstContent = contents.querySelector(".config-content");
                    if (firstContent) {
                        activateTab(firstTab, firstContent);
                    }
                }
            }
        });

        // Activate the first tab by default
        const firstTab = tabs.querySelector(".tab-button:not(.add-tab)");
        if (firstTab) {
            const firstContent = contents.querySelector(".config-content");
            activateTab(firstTab, firstContent);
        }
    });

    // Save changes
    saveButton.addEventListener("click", async () => {
        const sections = {};
        let error = false;
        const textareas = document.querySelectorAll(".config-content");

        for (const textarea of textareas) {
            const section = textarea.dataset.section;
            const subsection = textarea.dataset.subsection;

            if (!sections[section]) sections[section] = {};
            try {
                sections[section][subsection] = JSON.parse(textarea.value); // Validate and parse JSON
            } catch (e) {
                alert(`Invalid JSON in ${section} > ${subsection}`);
                error = true;
                break; // break for loop
            }
        }

        if (error) return;
        // Send updated data to the server
        const response = await fetch("/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sections),
        });

        if (response.ok) {
            alert("Configuration saved successfully.");
        } else {
            alert("Failed to save configuration.");
        }
    });
});

document.getElementById("cancel-button").addEventListener("click", () => {
    location.reload();
});

// save configuration as yaml file after validation of current configuration from ui
document.getElementById("download-button").addEventListener("click", async () => {
    const sections = {};
    let error = false;
    let aa = "";
    JSONToYAML = async (json) => {
        // let yaml = "";
        // for (const section in json) {
        //     yaml += `${section}:\n`;
        //     for (const subsection in json[section]) {
        //         yaml += `  ${subsection}:\n`;
        //         const subsectionContent = json[section][subsection];
        //         for (const key in subsectionContent) {
        //             yaml += `    ${key}: ${subsectionContent[key]}\n`;
        //         }
        //     }
        // }
        // return yaml;
        //  call api to convert json to yaml
        const response = await fetch("/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(json),
        });
        
        if (response.ok) {
            return await response.text();
        } else {
            alert("Failed to convert configuration to yaml.");
            return "";
        }
    }
    const textareas = document.querySelectorAll(".config-content");

    for (const textarea of textareas) {
        const section = textarea.dataset.section;
        const subsection = textarea.dataset.subsection;

        if (!sections[section]) sections[section] = {};
        try {
            sections[section][subsection] = JSON.parse(textarea.value); // Validate and parse JSON
        } catch (e) {
            alert(`Invalid JSON in ${section} > ${subsection}`);
            error = true;
            break; // break for loop
        }
    }

    if (error) return;
    yaml = await JSONToYAML(sections);
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "configuration.yaml";
    console.log(url);
    a.click();
    URL.revokeObjectURL(url);
   
});